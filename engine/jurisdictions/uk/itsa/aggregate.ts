// Cumulative aggregation: records -> year-to-date quarterly totals for an MTD ITSA quarterly
// update. Each quarter's update is cumulative from the start of the tax year (not just its own
// period), so a missed or corrected earlier quarter self-heals on the next submission.

import type { LedgerRecord, Pence, SourceType, TaxYear } from './types'
import { quartersFor, type Quarter } from './periods'
import { categoryByKey } from './categories'

export interface CumulativeUpdate {
  source: SourceType
  quarter: Quarter
  totals: Record<string, Pence>   // categoryKey -> cumulative year-to-date total
  recordCount: number
}

/**
 * Aggregates ledger records into the cumulative year-to-date totals for one quarterly update.
 * Window is `quarter.cumulativeStart <= record.date <= quarter.periodEnd` (ISO yyyy-mm-dd
 * strings sort lexicographically, so a plain compare is safe). Records for the other source
 * are excluded before validation, so a property record sitting in a mixed ledger never throws
 * while aggregating self-employment. Every record inside the window and matching source must
 * resolve via `categoryByKey(record.category, source)` and have a `kind` matching the category
 * definition — an unknown or mismatched category throws.
 *
 * Consolidation (`opts.consolidated`) folds every expense category whose definition is
 * `consolidatable !== false` and not `alwaysSeparate` into a single `consolidatedExpenses`
 * total; income categories and `alwaysSeparate` fields (e.g. `residentialFinancialCost`,
 * restricted under Section 24) always keep their own key.
 */
export function cumulativeUpdate(
  records: LedgerRecord[],
  source: SourceType,
  taxYear: TaxYear,
  quarterIndex: 1 | 2 | 3 | 4,
  opts?: { election?: 'standard' | 'calendar'; consolidated?: boolean },
): CumulativeUpdate {
  const quarter = quartersFor(taxYear, opts?.election ?? 'standard')[quarterIndex - 1]

  const totals: Record<string, Pence> = {}
  let recordCount = 0

  for (const record of records) {
    if (record.source !== source) continue
    if (record.date < quarter.cumulativeStart || record.date > quarter.periodEnd) continue

    const def = categoryByKey(record.category, source)
    if (def.kind !== record.kind) {
      throw new Error(`unknown category: '${record.category}' — kind mismatch (record is ${record.kind}, category is ${def.kind})`)
    }

    const key = opts?.consolidated && def.kind === 'expense' && def.consolidatable !== false && !def.alwaysSeparate
      ? 'consolidatedExpenses'
      : record.category

    totals[key] = (totals[key] ?? 0) + record.amount
    recordCount += 1
  }

  return { source, quarter, totals, recordCount }
}
