// MTD Income Tax eligibility: whether, and from when, a person is mandated onto Making Tax
// Digital for Income Tax, per the phased thresholds in SI 2026/336 reg 27.
//
// THE GOTCHA: qualifying income is GROSS turnover — self-employment turnover plus UK property
// receipts, taken straight from the relevant Self Assessment return — BEFORE any expenses are
// deducted. A sole trader with £55,000 of turnover and £30,000 of costs (£25,000 profit) is
// still mandated at the £50,000/2024-25 step; profit never enters this calculation.
//
// PURITY: this module never reads the wall clock (no Date.now / new Date anywhere in the
// engine). `checkEligibility` derives its answer entirely from the caller-supplied income rows
// and the threshold table in config.ts. Whether a firing step reads as already-in-force
// ('mandated') or still-upcoming ('mandated-later') is decided by comparing the firing step to
// the EARLIEST step in the table, not by comparing dates to today: the 2024-25/£50,000 step is
// the earliest step and, by product context, is already in force, so a firing there is always
// 'mandated'; any other (later) step firing is always 'mandated-later'.

import type { Pence, TaxYear } from './types'
import { configFor, MTD_ELIGIBILITY_URL, type MtdThresholdStep } from './config'

export interface YearlyGrossIncome {
  taxYear: TaxYear
  selfEmploymentGross: Pence
  ukPropertyGross: Pence
}

export interface EligibilityResult {
  status: 'mandated' | 'mandated-later' | 'below-threshold' | 'needs-information'
  mandatedFrom?: string
  triggeringYear?: TaxYear
  qualifyingIncome: Pence | null
  missingTaxYears: TaxYear[]
  explain: string[]     // plain-words reasoning, each line citing its rule
  exemptionsNote: string
}

const EXEMPTIONS_URL = 'https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax'

const EXEMPTIONS_NOTE =
  'Even if you are mandated, you can apply for an exemption if you are digitally excluded — for example ' +
  'for reasons of age, disability, location or religion that make it impractical to keep digital records. ' +
  'Some people are automatically exempt without applying, such as someone with a power of attorney acting ' +
  `for them or someone without a National Insurance number. See ${EXEMPTIONS_URL}.`

const gbp = (pence: Pence): string => `£${(pence / 100).toLocaleString('en-GB')}`

function grossFor(incomes: YearlyGrossIncome[], taxYear: TaxYear): Pence | undefined {
  const row = incomes.find((i) => i.taxYear === taxYear)
  return row ? row.selfEmploymentGross + row.ukPropertyGross : undefined
}

interface FiringStep { step: MtdThresholdStep; qualifyingIncome: Pence }

/**
 * Checks MTD IT eligibility from GROSS turnover (self-employment + UK property, before
 * expenses) for each measured tax year, against the phased threshold steps in
 * `configFor('2026-27').mtdThresholds` (SI 2026/336 reg 27). A step "fires" when the income
 * supplied for its `incomeYear` exceeds `qualifyingIncomeOver`; a year with no supplied income
 * row is simply not measured against that step. Among firing steps, the one with the earliest
 * `mandatedFrom` wins. That winning step reads as `'mandated'` only when it IS the table's
 * earliest step (2024-25 / £50,000, in force by product context); any other winning step reads
 * as `'mandated-later'`. A final below-threshold result requires every phased year to be
 * measured; otherwise the result is `needs-information` so a missing earlier year can never
 * be mistaken for a zero-income year.
 */
export function checkEligibility(incomes: YearlyGrossIncome[]): EligibilityResult {
  const thresholds = configFor('2026-27').mtdThresholds
  const steps = thresholds.value
  const earliestStep = steps[0]

  const explain: string[] = [
    'Qualifying income is your GROSS turnover — self-employment turnover plus UK property ' +
      'income, added together before any expenses are deducted, taken from your Self Assessment ' +
      `return for that tax year. It is not your profit. See ${MTD_ELIGIBILITY_URL}.`,
  ]

  const firing: FiringStep[] = []
  const missingTaxYears: TaxYear[] = []
  for (const step of steps) {
    const qualifyingIncome = grossFor(incomes, step.incomeYear)
    if (qualifyingIncome === undefined) {
      missingTaxYears.push(step.incomeYear)
      continue
    }
    const fires = qualifyingIncome > step.qualifyingIncomeOver
    explain.push(
      `In ${step.incomeYear} your qualifying income was ${gbp(qualifyingIncome)}, which is ` +
        `${fires ? 'over' : 'not over'} the ${gbp(step.qualifyingIncomeOver)} threshold for that year ` +
        `(${thresholds.si}, mandated from ${step.mandatedFrom} if crossed). ${thresholds.source}`,
    )
    if (fires) firing.push({ step, qualifyingIncome })
  }

  if (firing.length === 0) {
    const latest = [...incomes].sort((a, b) => (a.taxYear < b.taxYear ? -1 : a.taxYear > b.taxYear ? 1 : 0)).at(-1)
    if (missingTaxYears.length > 0) {
      explain.push(
        `No SUPPLIED year crossed its threshold, but ${missingTaxYears.join(', ')} ${missingTaxYears.length === 1 ? 'was' : 'were'} not measured. ` +
          `That missing history can change whether you already entered an earlier phase, so this is not a final out-of-scope decision. ` +
          `See ${MTD_ELIGIBILITY_URL}.`,
      )
      return {
        status: 'needs-information',
        qualifyingIncome: latest ? latest.selfEmploymentGross + latest.ukPropertyGross : null,
        missingTaxYears,
        explain,
        exemptionsNote: EXEMPTIONS_NOTE,
      }
    }
    explain.push(
      `Every phased year was measured and none crossed its strictly-over threshold, so the supplied history is below the MTD Income Tax thresholds (${thresholds.si}). ` +
        `This does not decide whether another Self Assessment obligation applies. See ${MTD_ELIGIBILITY_URL}.`,
    )
    return {
      status: 'below-threshold',
      qualifyingIncome: latest ? latest.selfEmploymentGross + latest.ukPropertyGross : 0,
      missingTaxYears,
      explain,
      exemptionsNote: EXEMPTIONS_NOTE,
    }
  }

  const winner = firing.reduce((earliest, candidate) =>
    candidate.step.mandatedFrom < earliest.step.mandatedFrom ? candidate : earliest)

  const status = winner.step.mandatedFrom === earliestStep.mandatedFrom ? 'mandated' : 'mandated-later'

  const earlierMissing = steps
    .filter((step) => step.mandatedFrom < winner.step.mandatedFrom && missingTaxYears.includes(step.incomeYear))
    .map((step) => step.incomeYear)
  if (earlierMissing.length > 0) {
    explain.push(
      `${winner.step.incomeYear} crosses its threshold, but earlier phased ${earlierMissing.join(', ')} ${earlierMissing.length === 1 ? 'is' : 'are'} missing. ` +
        `An earlier phase may already apply, so supply that return history before relying on a start date. ${thresholds.source}`,
    )
    return {
      status: 'needs-information',
      triggeringYear: winner.step.incomeYear,
      qualifyingIncome: winner.qualifyingIncome,
      missingTaxYears,
      explain,
      exemptionsNote: EXEMPTIONS_NOTE,
    }
  }

  explain.push(
    `${winner.step.incomeYear} is the earliest year to cross its threshold, so Making Tax Digital for ` +
      `Income Tax is ${status === 'mandated' ? '' : 'expected to be '}mandated from ${winner.step.mandatedFrom} ` +
      `(${thresholds.si}). ${thresholds.source}`,
  )

  return {
    status,
    mandatedFrom: winner.step.mandatedFrom,
    triggeringYear: winner.step.incomeYear,
    qualifyingIncome: winner.qualifyingIncome,
    missingTaxYears,
    explain,
    exemptionsNote: EXEMPTIONS_NOTE,
  }
}
