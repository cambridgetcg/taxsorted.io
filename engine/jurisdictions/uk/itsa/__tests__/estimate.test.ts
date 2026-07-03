import { describe, it, expect } from 'vitest'
import { estimateLiability } from '../estimate'

describe('2026-27 liability estimate (rUK)', () => {
  it('sole trader £60,000 profit: IT £11,432, C4 £2,456.60, C2 nil', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 6000000, propertyIncome: 0, propertyExpenses: 0, residentialFinanceCosts: 0 })
    expect(e.incomeTax).toBe(1143200)     // 37700×20% + 9730×40%
    expect(e.class4).toBe(245660)         // 37700×6% + 9730×2%
    expect(e.class2).toBe(0)              // ≥ £7,105 → treated as paid
    expect(e.totalLiability).toBe(1143200 + 245660)
  })
  it('PA tapers at £110,000: PA £7,570, IT £33,432', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 11000000, propertyIncome: 0, propertyExpenses: 0, residentialFinanceCosts: 0 })
    expect(e.personalAllowance).toBe(757000)
    expect(e.incomeTax).toBe(3343200)
  })
  it('landlord S24: £18,000 rents, £3,000 expenses, £5,000 residential finance → credit £1,000, no carry-forward', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 0, propertyIncome: 1800000, propertyExpenses: 300000, residentialFinanceCosts: 500000, otherNonSavingsIncome: 3000000 })
    expect(e.s24Credit).toBe(100000)      // 20% × min(5000, 15000, ANI)
    expect(e.s24CarriedForward).toBe(0)
    expect(e.class4).toBe(0)              // property is not trading profit
  })
  it('S24 credit is capped by property profits, remainder carries forward', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 0, propertyIncome: 700000, propertyExpenses: 500000, residentialFinanceCosts: 900000, otherNonSavingsIncome: 3000000 })
    // property profit £2,000 < finance £9,000 → credit 20%×2,000 = £400; £7,000 c/f
    expect(e.s24Credit).toBe(40000)
    expect(e.s24CarriedForward).toBe(700000)
  })
  it('S24 credit is capped by income tax alone, never by NIC (statutory invariant)', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 0, propertyIncome: 200000, propertyExpenses: 0, residentialFinanceCosts: 5000000, otherNonSavingsIncome: 0 })
    expect(e.s24Credit).toBeLessThanOrEqual(e.incomeTax)
    // carry-forward is the pre-cap lowest-of-three remainder, unaffected by the income-tax cap
    expect(e.s24CarriedForward).toBe(5000000 - 200000)
    expect(e.lines.some(l => /carried forward/i.test(l.label))).toBe(true)
  })
  it('sub-SPT profits: Class 2 voluntary flagged, not charged', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 600000, propertyIncome: 0, propertyExpenses: 0, residentialFinanceCosts: 0 })
    expect(e.class2).toBe(0)
    expect(e.lines.map(l => l.label).join(' ')).toMatch(/voluntary/i)
  })
  it('POA: prior bill £3,000 → two × £1,500 on 31 Jan and 31 Jul', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 6000000, propertyIncome: 0, propertyExpenses: 0, residentialFinanceCosts: 0, priorYearSaBill: 300000 })
    expect(e.paymentsOnAccount).toEqual({ each: 150000, dates: ['2028-01-31', '2028-07-31'] })
  })
  it('POA: prior bill £900 → none (under £1,000)', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 6000000, propertyIncome: 0, propertyExpenses: 0, residentialFinanceCosts: 0, priorYearSaBill: 90000 })
    expect(e.paymentsOnAccount).toBeNull()
  })
  it('labels itself an estimate', () => {
    const e = estimateLiability({ taxYear: '2026-27', tradingProfit: 100000, propertyIncome: 0, propertyExpenses: 0, residentialFinanceCosts: 0 })
    expect(e.kind).toBe('estimate'); expect(e.scope).toBe('rUK')
  })
})
