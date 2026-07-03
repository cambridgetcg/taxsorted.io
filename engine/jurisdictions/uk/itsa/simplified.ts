import type { Pence, TaxYear } from './types'
import { configFor } from './config'

export function mileageDeduction(
  businessMiles: number,
  vehicle: 'car-or-van' | 'motorcycle',
  taxYear: TaxYear
): { amount: Pence; breakdown: string; source: string; sources: string[] } {
  const config = configFor(taxYear)

  if (vehicle === 'motorcycle') {
    const rate = config.mileageMotorcycle.value
    const amount = businessMiles * rate
    return {
      amount,
      breakdown: `${businessMiles.toLocaleString()} miles × ${rate}p`,
      source: config.mileageMotorcycle.source,
      sources: [config.mileageMotorcycle.source],
    }
  }

  // car-or-van: tiered pricing
  const first10kRate = config.mileageFirst10k.value
  const afterRate = config.mileageAfter10k.value

  let amount: Pence
  let breakdown: string
  let sources: string[]

  if (businessMiles <= 10000) {
    amount = businessMiles * first10kRate
    breakdown = `${businessMiles.toLocaleString()} miles × ${first10kRate}p`
    sources = [config.mileageFirst10k.source]
  } else {
    const firstTierMiles = 10000
    const secondTierMiles = businessMiles - 10000
    const firstTierAmount = firstTierMiles * first10kRate
    const secondTierAmount = secondTierMiles * afterRate
    amount = firstTierAmount + secondTierAmount
    breakdown = `${firstTierMiles.toLocaleString()} miles × ${first10kRate}p + ${secondTierMiles.toLocaleString()} miles × ${afterRate}p`
    sources = [config.mileageFirst10k.source, config.mileageAfter10k.source]
  }

  return {
    amount,
    breakdown,
    source: config.mileageFirst10k.source,
    sources,
  }
}

export function wfhDeduction(
  hoursByMonth: number[],
  taxYear: TaxYear
): { amount: Pence; source: string } {
  const config = configFor(taxYear)
  const bands = config.wfhFlatRates.value

  let totalAmount: Pence = 0

  for (const hours of hoursByMonth) {
    // Find the band that matches this month's hours
    const matchedBand = bands.find(b => {
      if (hours < 25) return false
      if (b.maxHours === null) return hours >= b.minHours
      return hours >= b.minHours && hours <= b.maxHours
    })

    if (matchedBand) {
      totalAmount += matchedBand.monthly
    }
  }

  return {
    amount: totalAmount,
    source: config.wfhFlatRates.source,
  }
}

export function premisesPersonalUse(
  monthlyPeople: number[],
  taxYear: TaxYear
): { deduction: Pence; source: string } {
  const config = configFor(taxYear)
  const rates = config.premisesFlatRates.value

  let totalDeduction: Pence = 0

  for (const people of monthlyPeople) {
    if (people === 0) {
      // No people in the premises → £0 deduction for that month
      continue
    }

    // Clamp to 3+ (the highest rate band)
    const clampedPeople = Math.min(people, 3)

    // Find the rate for this people count
    const rate = rates.find(r => r.people === clampedPeople)
    if (rate) {
      totalDeduction += rate.monthly
    }
  }

  return {
    deduction: totalDeduction,
    source: config.premisesFlatRates.source,
  }
}
