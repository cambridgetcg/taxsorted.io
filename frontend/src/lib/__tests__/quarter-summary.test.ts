import { describe, it, expect } from 'vitest'
import type { LedgerRecord } from '@taxsorted/engine/uk/itsa'
import { quarterSummaryFor } from '../quarter-summary'

// All dates fall inside Q1 2026-27 standard (2026-04-06 .. 2026-07-05).
const records: LedgerRecord[] = [
  { id: 'a', date: '2026-05-01', amount: 10000, kind: 'income', category: 'turnover', source: 'self-employment' },
  { id: 'b', date: '2026-05-02', amount: 2500, kind: 'expense', category: 'adminCosts', source: 'self-employment' },
  { id: 'c', date: '2026-05-03', amount: 4000, kind: 'income', category: 'other', source: 'self-employment' },
  // Different source — must be excluded from a self-employment summary.
  { id: 'd', date: '2026-05-04', amount: 5000, kind: 'income', category: 'periodAmount', source: 'uk-property' },
]

describe('quarterSummaryFor', () => {
  it('splits income and expenses instead of summing them into one figure', () => {
    const s = quarterSummaryFor(records, 'self-employment', '2026-27', 1)
    expect(s).toEqual({ recordCount: 3, income: 14000, expenses: 2500 })
  })
  it('only counts the requested source', () => {
    const s = quarterSummaryFor(records, 'uk-property', '2026-27', 1)
    expect(s).toEqual({ recordCount: 1, income: 5000, expenses: 0 })
  })
  it('returns null instead of throwing on a kind/category mismatch', () => {
    const bad: LedgerRecord[] = [
      { id: 'x', date: '2026-05-01', amount: 100, kind: 'expense', category: 'turnover', source: 'self-employment' },
    ]
    expect(quarterSummaryFor(bad, 'self-employment', '2026-27', 1)).toBeNull()
  })
})
