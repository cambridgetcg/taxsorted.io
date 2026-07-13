// TaxSorted VAT engine — the brain between your books and HMRC.
//
// Both worlds: a human UI renders these results; an agent calls the same functions.
// One honest path: transactions → 9 boxes → validation → a plain-language answer.
//
//   import { prepareVatReturn } from "@taxsorted/engine/uk/vat";
//   const { data, summary, validation } = prepareVatReturn(transactions, {
//     periodKey: "24A1", periodEnd: "2024-03-31",
//   });
//   summary.headline // "You owe HMRC £500.00"

import type { VATReturnData } from "./types";
import { validateVATReturnData, type ValidationResult } from "../hmrc/vat-api";
import { computeReturnFromTransactions, type Transaction } from "./compute";
import { summarizeReturn, type VatReturnSummary } from "./summary";

export * from "./types";
export * from "./vrn";
export * from "./compute";
export * from "./deadlines";
export * from "./summary";
export * from "./config";
export * from "./optimiser";
export * from "./categorise";
export * from "./explain";
export * from "./guided";
export * from "./detailed";
// Re-export HMRC-contract validation so the engine is one import surface.
export { validateVATReturnData, calculateVATReturnTotals } from "../hmrc/vat-api";

export interface PreparedVatReturn {
  data: VATReturnData;
  summary: VatReturnSummary;
  validation: ValidationResult;
}

/**
 * One call, end to end: compute the return from transactions, validate it against the
 * HMRC contract, and produce the plain-language summary + deadline. The single entry
 * point a human form or an agent should reach for.
 */
export function prepareVatReturn(
  transactions: Transaction[],
  opts: { periodKey: string; periodEnd?: string | Date; finalised?: boolean; today?: string | Date },
): PreparedVatReturn {
  const data = computeReturnFromTransactions(transactions, {
    periodKey: opts.periodKey,
    finalised: opts.finalised,
  });
  return {
    data,
    summary: summarizeReturn(data, opts.periodEnd, opts.today),
    validation: validateVATReturnData(data),
  };
}
