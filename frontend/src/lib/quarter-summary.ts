// i18n: deferred to M2 — plain English for launch

import {
  categoryByKey,
  cumulativeUpdate,
  type LedgerRecord,
  type Pence,
  type SourceType,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";

export interface QuarterSummary {
  recordCount: number;
  income: Pence;
  expenses: Pence;
}

/**
 * One source's cumulative year-to-date position for a quarter, split into
 * income and expense totals — summing the two into a single figure would be
 * meaningless (income plus costs is neither turnover nor profit). Returns
 * null instead of throwing if any stored record's category or kind can't be
 * resolved: a summary chip failing to add up is not worth crashing a page
 * over, and storage is shared mutable state a future import path could feed.
 */
export function quarterSummaryFor(
  records: LedgerRecord[],
  source: SourceType,
  taxYear: TaxYear,
  quarterIndex: 1 | 2 | 3 | 4,
  election: "standard" | "calendar" = "standard"
): QuarterSummary | null {
  try {
    const update = cumulativeUpdate(records, source, taxYear, quarterIndex, {
      election,
    });
    let income = 0;
    let expenses = 0;
    for (const [key, total] of Object.entries(update.totals)) {
      if (categoryByKey(key, source).kind === "income") {
        income += total;
      } else {
        expenses += total;
      }
    }
    return { recordCount: update.recordCount, income, expenses };
  } catch {
    return null;
  }
}
