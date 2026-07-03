"use client";

import Link from "next/link";
import { useState } from "react";

export default function DividendCalculator() {
  const [profit, setProfit] = useState("");
  const [salary, setSalary] = useState("12570");

  const companyProfit = parseFloat(profit) || 0;
  const directorSalary = parseFloat(salary) || 0;

  // 2024/25 rates
  const personalAllowance = 12570;
  const basicThreshold = 50270;
  const higherThreshold = 125140;
  const corpTaxSmallLimit = 50000;
  const corpTaxMainLimit = 250000;
  const smallRate = 0.19;
  const mainRate = 0.25;
  const dividendAllowance = 500;
  const divBasicRate = 0.0875;
  const divHigherRate = 0.3375;
  const divAdditionalRate = 0.3935;

  // Step 1: Corporation Tax
  const taxableProfit = Math.max(0, companyProfit - directorSalary);

  let corpTax: number;
  if (taxableProfit <= corpTaxSmallLimit) {
    corpTax = taxableProfit * smallRate;
  } else if (taxableProfit >= corpTaxMainLimit) {
    corpTax = taxableProfit * mainRate;
  } else {
    // Marginal relief — simplified
    const fullMain = taxableProfit * mainRate;
    const smallPlusFraction = (taxableProfit - corpTaxSmallLimit) * (mainRate - smallRate) * (corpTaxSmallLimit / (corpTaxMainLimit - corpTaxSmallLimit));
    corpTax = Math.max(fullMain - smallPlusFraction, taxableProfit * smallRate);
  }

  const distributableReserves = taxableProfit - corpTax;

  // Step 2: Personal tax on dividend
  const dividendReceived = Math.min(distributableReserves, distributableReserves);

  // Personal allowance after salary
  const remainingPA = Math.max(0, personalAllowance - directorSalary);

  // Dividend income within bands
  const divAfterPA = Math.max(0, dividendReceived - remainingPA);

  // First £500 of dividends is tax-free
  const taxableDividend = Math.max(0, divAfterPA - dividendAllowance);

  // Calculate dividend tax by band
  // First, determine how much falls in basic, higher, additional
  const incomeBeforeDiv = directorSalary;
  const basicRoom = Math.max(0, basicThreshold - incomeBeforeDiv - remainingPA);
  const higherRoom = Math.max(0, higherThreshold - basicThreshold);

  let divTax = 0;
  let divInBasic = 0, divInHigher = 0, divInAdditional = 0;

  if (taxableDividend > 0) {
    divInBasic = Math.min(taxableDividend, basicRoom);
    divTax += divInBasic * divBasicRate;

    const afterBasic = taxableDividend - divInBasic;
    if (afterBasic > 0) {
      divInHigher = Math.min(afterBasic, higherRoom);
      divTax += divInHigher * divHigherRate;

      divInAdditional = afterBasic - divInHigher;
      if (divInAdditional > 0) {
        divTax += divInAdditional * divAdditionalRate;
      }
    }
  }

  const totalTax = corpTax + divTax;
  const takeHome = directorSalary + dividendReceived - divTax;

  const fmt = (n: number) =>
    n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const fmt2 = (n: number) =>
    n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="container">
      <Link href="/tools" className="back-link">← All tools</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Dividend Calculator</h1>
        <p>Enter company profit — see Corporation Tax, dividend tax, and take-home.</p>
      </div>

      <div className="calc-card">
        <div className="calc-input-row">
          <label htmlFor="profit">Company profit before salary (£)</label>
          <input
            id="profit"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            autoFocus
          />
        </div>

        <div className="calc-input-row">
          <label htmlFor="salary">Director salary (£/year)</label>
          <input
            id="salary"
            type="number"
            inputMode="numeric"
            placeholder="12570"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />
        </div>

        {companyProfit > 0 && (
          <>
            <div className="calc-result">
              <div className="calc-result-row">
                <span className="label">Company profit</span>
                <span className="value">{fmt(companyProfit)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">Director salary</span>
                <span className="value">−{fmt(directorSalary)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">Taxable profit</span>
                <span className="value">{fmt(taxableProfit)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">Corporation Tax</span>
                <span className="value">−{fmt(corpTax)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">Dividend received</span>
                <span className="value">{fmt(dividendReceived)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">Dividend tax</span>
                <span className="value">−{fmt(divTax)}</span>
              </div>
              <div className="calc-result-row total">
                <span className="label">Total take-home</span>
                <span className="value">{fmt(takeHome)}</span>
              </div>
            </div>

            <div className="calc-math">
              <strong>Step 1 — Corporation Tax:</strong><br />
              Profit: {fmt(companyProfit)} − salary {fmt(directorSalary)} = <strong>{fmt(taxableProfit)}</strong><br />
              {taxableProfit <= corpTaxSmallLimit && (
                <>Small profits rate (19%): {fmt2(taxableProfit)} × 19% = <strong>{fmt(corpTax)}</strong><br /></>
              )}
              {taxableProfit > corpTaxSmallLimit && taxableProfit < corpTaxMainLimit && (
                <>Marginal relief applied (19%–25% taper): <strong>{fmt(corpTax)}</strong><br /></>
              )}
              {taxableProfit >= corpTaxMainLimit && (
                <>Main rate (25%): {fmt2(taxableProfit)} × 25% = <strong>{fmt(corpTax)}</strong><br /></>
              )}
              Distributable reserves: {fmt(taxableProfit)} − {fmt(corpTax)} = <strong>{fmt(distributableReserves)}</strong><br /><br />

              <strong>Step 2 — Dividend tax:</strong><br />
              Dividend received: <strong>{fmt(dividendReceived)}</strong><br />
              {remainingPA > 0 && (
                <>Personal Allowance unused: £{personalAllowance.toLocaleString()} − {fmt(directorSalary)} = {fmt(remainingPA)} (tax-free)<br /></>
              )}
              Dividend Allowance: {fmt(dividendAllowance)} (tax-free)<br />
              Taxable dividend: {fmt(dividendReceived)} − {fmt(remainingPA)} − {fmt(dividendAllowance)} = <strong>{fmt(taxableDividend)}</strong><br />
              {divInBasic > 0 && (
                <>Basic rate (8.75%): {fmt(divInBasic)} × 8.75% = {fmt2(divInBasic * divBasicRate)}<br /></>
              )}
              {divInHigher > 0 && (
                <>Higher rate (33.75%): {fmt(divInHigher)} × 33.75% = {fmt2(divInHigher * divHigherRate)}<br /></>
              )}
              {divInAdditional > 0 && (
                <>Additional rate (39.35%): {fmt(divInAdditional)} × 39.35% = {fmt2(divInAdditional * divAdditionalRate)}<br /></>
              )}
              Dividend tax total: <strong>{fmt(divTax)}</strong><br /><br />

              <strong>Step 3 — Take-home:</strong><br />
              Salary {fmt(directorSalary)} + Dividend {fmt(dividendReceived)} − Div tax {fmt(divTax)} = <strong>{fmt(takeHome)}</strong><br />
              Total tax paid: Corp Tax {fmt(corpTax)} + Div Tax {fmt(divTax)} = <strong>{fmt(totalTax)}</strong>
            </div>
          </>
        )}
      </div>

      <div className="source" style={{ maxWidth: 560, margin: "30px auto 0" }}>
        Based on 2024/25 rates. Assumes director is the sole shareholder, no
        other income, and Employment Allowance is claimed (so no employer NI
        on the salary). Excludes student loans and pension. See our{" "}
        <Link href="/compare/salary-vs-dividend">Salary vs Dividend comparison</Link>{" "}
        and{" "}
        <Link href="/learn/corporation-tax">Corporation Tax guide</Link>.
      </div>
    </div>
  );
}