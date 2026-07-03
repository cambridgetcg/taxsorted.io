import { describe, it, expect } from 'vitest'
import { mileageDeduction, wfhDeduction, premisesPersonalUse } from '../simplified'

describe('simplified expenses 2026-27', () => {
  it('12,000 car miles → 10,000×55p + 2,000×25p = £6,000', () => {
    const r = mileageDeduction(12000, 'car-or-van', '2026-27')
    expect(r.amount).toBe(600000)
    expect(r.breakdown).toContain('55p')
    expect(r.sources).toHaveLength(2)
    expect(r.sources[0]).not.toBe(r.sources[1])
  })
  it('motorcycles are 24p flat', () => {
    const r = mileageDeduction(1000, 'motorcycle', '2026-27')
    expect(r.amount).toBe(24000)
    expect(r.sources).toHaveLength(1)
  })
  it('WFH bands: 30h→£10, 60h→£18, 120h→£26, 10h→£0 per month', () => {
    const r = wfhDeduction([30, 60, 120, 10, 0, 0, 0, 0, 0, 0, 0, 0], '2026-27')
    expect(r.amount).toBe(5400) // 1000+1800+2600
  })
  it('premises: [1,1,2] people → 350+350+500 = £1,200 personal-use deduction', () => {
    expect(premisesPersonalUse([1, 1, 2], '2026-27').deduction).toBe(120000)
  })
})
