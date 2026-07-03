import { describe, it, expect } from 'vitest'
import { tradingAllowanceCheck, propertyAllowanceCheck, rentARoomCheck, marriageAllowanceCheck } from '../optimise'

describe('honest optimisers', () => {
  it('trading allowance beats £600 of actual expenses', () => {
    const s = tradingAllowanceCheck(500000, 60000, '2026-27')
    expect(s.applies).toBe(true)
    expect(s.saving).toBe(40000) // £1,000 − £600 more deduction
  })
  it('trading allowance loses to £2,000 of actual expenses', () => {
    expect(tradingAllowanceCheck(500000, 200000, '2026-27').applies).toBe(false)
  })
  it('property allowance flags the S24 trap', () => {
    const s = propertyAllowanceCheck(800000, 20000, 50000, '2026-27')
    expect(s.trap).toMatch(/finance cost|Section 24/i) // claiming the allowance forfeits the 20% credit
  })
  it('rent-a-room: £6,000 income → relief applies, shared halves the limit', () => {
    expect(rentARoomCheck(600000, 100000, false, '2026-27').applies).toBe(true)
    expect(rentARoomCheck(600000, 100000, true, '2026-27').applies).toBe(false) // over £3,750 → compare, not automatic
  })
  it('marriage allowance: partner £9k, me £30k → ~£252 saving', () => {
    const s = marriageAllowanceCheck(3000000, 900000, '2026-27')
    expect(s.applies).toBe(true)
    expect(s.saving).toBe(25200)
  })
  it('marriage allowance refused for higher-rate taxpayer', () => {
    expect(marriageAllowanceCheck(9000000, 900000, '2026-27').applies).toBe(false)
  })
  it('property full relief with a would-be loss still warns about the lost loss and the S24 credit', () => {
    const s = propertyAllowanceCheck(80000, 150000, 50000, '2026-27')
    expect(s.applies).toBe(true)
    expect(s.trap).toMatch(/loss/i)
    expect(s.trap).toMatch(/finance cost|Section 24/i)
  })
  it('trading full relief: under £1,000 gross needs no reporting at all', () => {
    const s = tradingAllowanceCheck(80000, 0, '2026-27')
    expect(s.applies).toBe(true)
    expect(s.why).toMatch(/don't need to tell HMRC|no need to report/i)
  })
  it('rent-a-room under the limit is automatic', () => {
    expect(rentARoomCheck(300000, 0, false, '2026-27').applies).toBe(true)
  })
  it('marriage allowance: when both conditions fail, why names both problems', () => {
    const s = marriageAllowanceCheck(9000000, 2000000, '2026-27')
    expect(s.applies).toBe(false)
    expect(s.why).toMatch(/allowance/i)
    expect(s.why).toMatch(/basic/i)
  })
})
