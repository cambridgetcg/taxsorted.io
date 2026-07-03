"use client";

import Link from "next/link";
import { useState } from "react";

export default function VATCalculator() {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [rate, setRate] = useState(20);

  const num = parseFloat(amount) || 0;
  const vatRate = rate / 100;

  let net: number, vat: number, gross: number;
  if (mode === "add") {
    net = num;
    vat = net * vatRate;
    gross = net + vat;
  } else {
    gross = num;
    net = gross / (1 + vatRate);
    vat = gross - net;
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="container">
      <Link href="/tools" className="back-link">← All tools</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>VAT Calculator</h1>
        <p>Enter an amount — see net, VAT, and gross instantly.</p>
      </div>

      <div className="calc-card">
        <div className="calc-input-row">
          <label htmlFor="amount">Amount (£)</label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        <div className="calc-toggle-group">
          <div
            className={`calc-toggle ${mode === "add" ? "active" : ""}`}
            onClick={() => setMode("add")}
          >
            Add VAT
          </div>
          <div
            className={`calc-toggle ${mode === "remove" ? "active" : ""}`}
            onClick={() => setMode("remove")}
          >
            Remove VAT
          </div>
        </div>

        <div className="calc-input-row">
          <label htmlFor="rate">VAT Rate</label>
          <select id="rate" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            <option value={20}>20% — Standard rate</option>
            <option value={5}>5% — Reduced rate</option>
            <option value={0}>0% — Zero rate</option>
          </select>
        </div>

        {num > 0 && (
          <>
            <div className="calc-result">
              <div className="calc-result-row">
                <span className="label">Net amount</span>
                <span className="value">{fmt(net)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">VAT ({rate}%)</span>
                <span className="value">{fmt(vat)}</span>
              </div>
              <div className="calc-result-row total">
                <span className="label">Gross amount</span>
                <span className="value">{fmt(gross)}</span>
              </div>
            </div>
            <div className="calc-math">
              {mode === "add" ? (
                <>
                  <strong>Adding VAT:</strong><br />
                  Net = £{num.toFixed(2)}<br />
                  VAT = £{num.toFixed(2)} × {rate}% = <strong>{fmt(vat)}</strong><br />
                  Gross = £{num.toFixed(2)} + {fmt(vat)} = <strong>{fmt(gross)}</strong>
                </>
              ) : (
                <>
                  <strong>Removing VAT:</strong><br />
                  Gross = £{num.toFixed(2)} (includes {rate}% VAT)<br />
                  Net = £{num.toFixed(2)} ÷ {(1 + vatRate).toFixed(2)} = <strong>{fmt(net)}</strong><br />
                  VAT = £{num.toFixed(2)} − {fmt(net)} = <strong>{fmt(vat)}</strong>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="source" style={{ maxWidth: 560, margin: "30px auto 0" }}>
        VAT rates current as of 2024/25. See our{" "}
        <Link href="/learn/vat">VAT guide</Link> for when to register, how to
        file, and what you can claim.
      </div>
    </div>
  );
}