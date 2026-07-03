import { describe, it, expect } from 'vitest'
import { checkEligibility } from '../eligibility'

describe('MTD IT eligibility', () => {
  it('gross 40k SE + 15k property in 2024-25 → mandated from 6 Apr 2026', () => {
    const r = checkEligibility([{ taxYear: '2024-25', selfEmploymentGross: 4000000, ukPropertyGross: 1500000 }])
    expect(r.status).toBe('mandated')
    expect(r.mandatedFrom).toBe('2026-04-06')
    expect(r.qualifyingIncome).toBe(5500000)
  })
  it('gross expenses do not matter — 55k turnover with 30k costs is still mandated', () => {
    const r = checkEligibility([{ taxYear: '2024-25', selfEmploymentGross: 5500000, ukPropertyGross: 0 }])
    expect(r.status).toBe('mandated')
  })
  it('25k in 2025-26 → mandated later only if 2026-27 crosses £20k', () => {
    const r = checkEligibility([
      { taxYear: '2024-25', selfEmploymentGross: 2500000, ukPropertyGross: 0 },
      { taxYear: '2025-26', selfEmploymentGross: 2500000, ukPropertyGross: 0 },
      { taxYear: '2026-27', selfEmploymentGross: 2500000, ukPropertyGross: 0 },
    ])
    expect(r.status).toBe('mandated-later')
    expect(r.mandatedFrom).toBe('2028-04-06')
    expect(r.triggeringYear).toBe('2026-27')
  })
  it('≤£20k every year → below-threshold', () => {
    const r = checkEligibility([{ taxYear: '2026-27', selfEmploymentGross: 1800000, ukPropertyGross: 0 }])
    expect(r.status).toBe('below-threshold')
    expect(r.explain.join(' ')).toMatch(/SI 2026\/336/)
  })
})
