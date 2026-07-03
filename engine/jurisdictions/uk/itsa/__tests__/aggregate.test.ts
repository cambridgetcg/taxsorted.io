import { describe, it, expect } from 'vitest'
import { cumulativeUpdate } from '../aggregate'
import type { LedgerRecord } from '../types'

const R = (date: string, amount: number, kind: 'income'|'expense', category: string, source: 'self-employment'|'uk-property' = 'self-employment'): LedgerRecord =>
  ({ id: date + category + amount, date, amount, kind, category, source })

describe('cumulative quarterly updates', () => {
  const records = [
    R('2026-04-20', 500000, 'income', 'turnover'),
    R('2026-06-30', 250000, 'income', 'turnover'),
    R('2026-05-01', 40000, 'expense', 'carVanTravelExpenses'),
    R('2026-08-15', 300000, 'income', 'turnover'),        // Q2 only
    R('2026-08-20', 20000, 'expense', 'adminCosts'),       // Q2 only
    R('2027-04-04', 100000, 'income', 'turnover'),         // Q4 tail
    R('2026-05-05', 120000, 'income', 'periodAmount', 'uk-property'), // other source
  ]
  it('Q1 sums only records in 6 Apr–5 Jul for the right source', () => {
    const u = cumulativeUpdate(records, 'self-employment', '2026-27', 1)
    expect(u.totals.turnover).toBe(750000)
    expect(u.totals.carVanTravelExpenses).toBe(40000)
    expect(u.totals.periodAmount).toBeUndefined()
    expect(u.recordCount).toBe(3)
  })
  it('Q2 is cumulative from year start (self-heals a missed Q1)', () => {
    const u = cumulativeUpdate(records, 'self-employment', '2026-27', 2)
    expect(u.totals.turnover).toBe(1050000)
    expect(u.totals.adminCosts).toBe(20000)
  })
  it('Q4 covers the whole year', () => {
    const u = cumulativeUpdate(records, 'self-employment', '2026-27', 4)
    expect(u.totals.turnover).toBe(1150000)
  })
  it('consolidated view folds expenses but never the S24 field', () => {
    const prop = [
      R('2026-04-10', 90000, 'income', 'periodAmount', 'uk-property'),
      R('2026-04-11', 10000, 'expense', 'repairsAndMaintenance', 'uk-property'),
      R('2026-04-12', 5000, 'expense', 'professionalFees', 'uk-property'),
      R('2026-04-13', 25000, 'expense', 'residentialFinancialCost', 'uk-property'),
    ]
    const u = cumulativeUpdate(prop, 'uk-property', '2026-27', 1, { consolidated: true })
    expect(u.totals.consolidatedExpenses).toBe(15000)
    expect(u.totals.residentialFinancialCost).toBe(25000)
    expect(u.totals.repairsAndMaintenance).toBeUndefined()
  })
  it('throws on unknown category', () => {
    expect(() => cumulativeUpdate([R('2026-05-01', 100, 'expense', 'lambos')], 'self-employment', '2026-27', 1)).toThrow(/unknown category/i)
  })
  it('throws when a record claims a source but carries the other source\'s category (data error)', () => {
    expect(() => cumulativeUpdate(
      [R('2026-05-01', 100000, 'income', 'periodAmount', 'self-employment')],
      'self-employment', '2026-27', 1,
    )).toThrow(/unknown category/i)
  })
})
