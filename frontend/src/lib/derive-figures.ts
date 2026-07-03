// i18n: deferred to M2 — plain English for launch

import {
  categoryByKey,
  cumulativeUpdate,
  type LedgerRecord,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";

export interface DerivedFigures {
  tradingProfit: number; // floored at 0 — see the loss note this drives
  tradingProfitRaw: number;
  propertyIncome: number;
  propertyExpenses: number;
  residentialFinanceCosts: number;
  recordCount: number;
}

/**
 * Records -> the plain figures estimateLiability needs, summed cumulatively
 * to `quarterIndex`. Self-employment profit is income totals minus expense
 * totals; property expenses exclude the two residential-finance-cost fields
 * (Section 24 restricts those to a credit, handled separately by the
 * engine) — `residentialFinancialCostsCarriedForward` has no input on
 * EstimateInput yet, so it is read from records but not fed in (M1 gap,
 * documented, not silently dropped).
 */
export function deriveFigures(
  records: LedgerRecord[],
  taxYear: TaxYear,
  election: "standard" | "calendar",
  quarterIndex: 1 | 2 | 3 | 4
): DerivedFigures {
  const se = cumulativeUpdate(records, "self-employment", taxYear, quarterIndex, { election });
  const property = cumulativeUpdate(records, "uk-property", taxYear, quarterIndex, { election });

  let seIncome = 0;
  let seExpense = 0;
  for (const [key, total] of Object.entries(se.totals)) {
    if (categoryByKey(key, "self-employment").kind === "income") seIncome += total;
    else seExpense += total;
  }

  let propertyIncome = 0;
  let propertyExpenses = 0;
  let residentialFinanceCosts = 0;
  for (const [key, total] of Object.entries(property.totals)) {
    const def = categoryByKey(key, "uk-property");
    if (def.kind === "income") {
      propertyIncome += total;
    } else if (key === "residentialFinancialCost") {
      residentialFinanceCosts += total;
    } else if (key === "residentialFinancialCostsCarriedForward") {
      // excluded from this year's figures — see the doc comment above
    } else {
      propertyExpenses += total;
    }
  }

  const tradingProfitRaw = seIncome - seExpense;
  return {
    tradingProfit: Math.max(0, tradingProfitRaw),
    tradingProfitRaw,
    propertyIncome,
    propertyExpenses,
    residentialFinanceCosts,
    recordCount: se.recordCount + property.recordCount,
  };
}
