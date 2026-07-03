import { describe, it, expect } from 'vitest'
import * as itsa from '../index'

describe('itsa module surface', () => {
  it('exports the full toolkit', () => {
    for (const name of ['configFor', 'SE_CATEGORIES', 'PROPERTY_CATEGORIES', 'categoriesFor', 'categoryByKey',
      'quartersFor', 'quarterForDate', 'penaltyPosition', 'cumulativeUpdate', 'checkEligibility',
      'mileageDeduction', 'wfhDeduction', 'premisesPersonalUse', 'estimateLiability',
      'tradingAllowanceCheck', 'propertyAllowanceCheck', 'rentARoomCheck', 'marriageAllowanceCheck'])
      expect(itsa, name).toHaveProperty(name)
  })
})
