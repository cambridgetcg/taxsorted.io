import { describe, it, expect } from 'vitest'
import { configFor } from '../config'
import { UK_PERSONAL_2026_27 } from '../../personal/config'

describe('ITSA 2026-27 config', () => {
  const c = configFor('2026-27')
  it('has the frozen personal allowance with citation', () => {
    expect(c.personalAllowance.value).toBe(1257000)
    expect(c.personalAllowance.source).toMatch(/gov\.uk/)
  })
  it('has rUK bands', () => {
    expect(c.basicRateBand.value).toBe(3770000)
    expect(c.basicRate.value).toBe(0.20)
    expect(c.higherRateLimit.value).toBe(12514000)
    expect(c.higherRate.value).toBe(0.40)
    expect(c.additionalRate.value).toBe(0.45)
  })
  it('has NIC thresholds', () => {
    expect(c.class4LowerLimit.value).toBe(1257000)
    expect(c.class4UpperLimit.value).toBe(5027000)
    expect(c.class4MainRate.value).toBe(0.06)
    expect(c.class4UpperRate.value).toBe(0.02)
    expect(c.class2SmallProfitsThreshold.value).toBe(710500)
    expect(c.class2VoluntaryWeekly.value).toBe(365)
  })
  it('has the 55p mileage rate effective 6 April 2026', () => {
    expect(c.mileageFirst10k.value).toBe(55)
    expect(c.mileageFirst10k.effectiveFrom).toBe('2026-04-06')
    expect(c.mileageAfter10k.value).toBe(25)
    expect(c.mileageMotorcycle.value).toBe(24)
  })
  it('has allowances and property constants', () => {
    expect(c.tradingAllowance.value).toBe(100000)
    expect(c.propertyAllowance.value).toBe(100000)
    expect(c.rentARoom.value).toBe(750000)
    expect(c.rentARoomShared.value).toBe(375000)
    expect(c.propertyCashBasisLimit.value).toBe(15000000)
    expect(c.s24CreditRate.value).toBe(0.20)
    expect(c.consolidatedExpensesTurnoverLimit.value).toBe(9000000)
  })
  it('has taper + POA + MTD thresholds', () => {
    expect(c.paTaperThreshold.value).toBe(10000000)
    expect(c.poaThreshold.value).toBe(100000)
    expect(c.poaAtSourceFraction.value).toBe(0.8)
    expect(c.mtdThresholds.value).toEqual([
      { qualifyingIncomeOver: 5000000, incomeYear: '2024-25', mandatedFrom: '2026-04-06' },
      { qualifyingIncomeOver: 3000000, incomeYear: '2025-26', mandatedFrom: '2027-04-06' },
      { qualifyingIncomeOver: 2000000, incomeYear: '2026-27', mandatedFrom: '2028-04-06' },
    ])
    expect(c.mtdThresholds.si).toBe('SI 2026/336 reg 27')
  })
  it('rejects unknown years', () => {
    expect(() => configFor('2031-32')).toThrow(/no config/i)
  })
})

describe('cross-module consistency with uk/personal', () => {
  const c = configFor('2026-27')
  it('personalAllowance matches uk/personal in pence', () => {
    expect(c.personalAllowance.value).toBe(UK_PERSONAL_2026_27.personalAllowance * 100)
  })
  it('paTaperThreshold matches uk/personal personalAllowanceIncomeLimit in pence', () => {
    expect(c.paTaperThreshold.value).toBe(UK_PERSONAL_2026_27.personalAllowanceIncomeLimit * 100)
  })
  it('basicRateBand matches uk/personal bandsEnglandWalesNI.basic.taxableTo in pence', () => {
    expect(c.basicRateBand.value).toBe(UK_PERSONAL_2026_27.bandsEnglandWalesNI.basic.taxableTo * 100)
  })
  it('higherRateLimit matches uk/personal personalAllowanceZeroAt in pence', () => {
    expect(c.higherRateLimit.value).toBe(UK_PERSONAL_2026_27.personalAllowanceZeroAt * 100)
  })
})
