// rUK Self Assessment liability estimator: income tax (with PA taper), Class 4 + Class 2 NIC,
// Section 24 residential finance cost credit, and payments-on-account forecast. This is an
// ESTIMATE for planning purposes — HMRC's own calculation is authoritative. M1 covers a single
// taxpayer, rest-of-UK (non-Scottish, non-Welsh-devolved) rates only; savings/dividend income,
// pension contributions and Gift Aid extension of bands are out of scope (documented below).
//
// THE BAND-EDGE SUBTLETY: the basic/higher/additional rate bands apply to TAXABLE income (income
// after Personal Allowance), not to total income. The taper (see below) shrinks the PA as
// adjusted net income (ANI) rises above £100,000, but it does NOT move the band edges measured
// on taxable income. Those edges are FIXED at 0–£37,700 (basicRateBand), £37,700–£112,570
// (higher), above £112,570 (additional), where £112,570 = higherRateLimit(£125,140) minus the
// FULL, untapered personalAllowance(£12,570) — never the tapered PA actually given to this
// taxpayer. Recomputing the higher-band edge from the tapered PA would double-count the taper
// (once in a shrunken PA, again in a shrunken band) and is wrong; see config.ts higherRateLimit /
// personalAllowance citations for the statutory source.
//
// PA TAPER: pa = max(0, fullPA − floor(max(0, ani − taperThreshold) / 2)), integer pence, floor
// division, capped at [0, fullPA] (the floor/max/min chain below cannot exceed fullPA since the
// subtracted term is always >= 0).

import type { Pence, TaxYear } from './types'
import { configFor } from './config'

export interface EstimateInput {
  taxYear: TaxYear
  tradingProfit: Pence           // cash-basis profit (records already netted by caller)
  propertyIncome: Pence          // property receipts
  propertyExpenses: Pence        // allowable, EXCLUDING residential finance costs
  residentialFinanceCosts: Pence
  otherNonSavingsIncome?: Pence  // e.g. employment, taxed at rUK bands; default 0
  priorYearSaBill?: Pence        // for POA forecast
}

export interface Estimate {
  kind: 'estimate'; scope: 'rUK'
  personalAllowance: Pence       // after taper
  incomeTax: Pence; class4: Pence; class2: Pence
  s24Credit: Pence; s24CarriedForward: Pence
  totalLiability: Pence
  paymentsOnAccount: null | { each: Pence; dates: [string, string] }
  lines: Array<{ label: string; amount: Pence; cite: string }>
}

const round = (n: number): Pence => Math.round(n)

export function estimateLiability(input: EstimateInput): Estimate {
  const config = configFor(input.taxYear)
  const lines: Estimate['lines'] = []

  // --- Step 1: property profit (residential finance costs NOT deducted here — that's Section 24) ---
  const propertyProfit = Math.max(0, input.propertyIncome - input.propertyExpenses)

  // --- Step 2: total income / ANI. M1 has no pension or Gift Aid inputs, so ANI == total income. ---
  const otherIncome = input.otherNonSavingsIncome ?? 0
  const totalIncome = input.tradingProfit + propertyProfit + otherIncome
  const ani = totalIncome
  lines.push({
    label: 'Adjusted net income (M1: no pension contributions or Gift Aid inputs, so ANI = total income)',
    amount: ani,
    cite: config.paTaperThreshold.source,
  })

  // --- Step 3: Personal Allowance after taper ---
  const fullPa = config.personalAllowance.value
  const taperThreshold = config.paTaperThreshold.value
  const personalAllowance = Math.max(0, fullPa - Math.floor(Math.max(0, ani - taperThreshold) / 2))
  lines.push({ label: 'Personal Allowance (after taper)', amount: personalAllowance, cite: config.personalAllowance.source })

  // --- Step 4: income tax bands on TAXABLE income (see file-header note on the fixed band edges) ---
  const taxable = Math.max(0, totalIncome - personalAllowance)
  const basicRateBandSize = config.basicRateBand.value
  // Fixed edge, independent of taper: higherRateLimit − FULL personal allowance.
  const higherRateBandTop = config.higherRateLimit.value - fullPa

  const basicSlice = Math.min(taxable, basicRateBandSize)
  const higherSlice = Math.min(Math.max(0, taxable - basicRateBandSize), higherRateBandTop - basicRateBandSize)
  const additionalSlice = Math.max(0, taxable - higherRateBandTop)

  const basicTax = round(basicSlice * config.basicRate.value)
  const higherTax = round(higherSlice * config.higherRate.value)
  const additionalTax = round(additionalSlice * config.additionalRate.value)
  const incomeTax = basicTax + higherTax + additionalTax

  if (basicSlice > 0) lines.push({ label: `Basic rate: ${basicSlice}p @ ${config.basicRate.value * 100}%`, amount: basicTax, cite: config.basicRate.source })
  if (higherSlice > 0) lines.push({ label: `Higher rate: ${higherSlice}p @ ${config.higherRate.value * 100}%`, amount: higherTax, cite: config.higherRate.source })
  if (additionalSlice > 0) lines.push({ label: `Additional rate: ${additionalSlice}p @ ${config.additionalRate.value * 100}%`, amount: additionalTax, cite: config.additionalRate.source })

  // --- Step 5: Class 4 and Class 2 NIC (trading profit only — property income is not NICable) ---
  const c4Lower = config.class4LowerLimit.value
  const c4Upper = config.class4UpperLimit.value
  const c4MainBand = Math.max(0, Math.min(input.tradingProfit, c4Upper) - c4Lower)
  const c4UpperBand = Math.max(0, input.tradingProfit - c4Upper)
  const c4Main = round(c4MainBand * config.class4MainRate.value)
  const c4UpperTax = round(c4UpperBand * config.class4UpperRate.value)
  const class4 = c4Main + c4UpperTax
  if (class4 > 0) lines.push({ label: 'Class 4 NIC', amount: class4, cite: config.class4MainRate.source })

  const spt = config.class2SmallProfitsThreshold.value
  let class2: Pence = 0
  if (input.tradingProfit >= spt) {
    lines.push({ label: 'Class 2 NIC: treated as paid (profits at or above the Small Profits Threshold)', amount: 0, cite: config.class2SmallProfitsThreshold.source })
  } else {
    const voluntaryAnnual = 52 * config.class2VoluntaryWeekly.value
    lines.push({
      label: `Class 2 NIC: below the Small Profits Threshold, not charged — voluntary Class 2 available at £${(config.class2VoluntaryWeekly.value / 100).toFixed(2)}/week (52 × £${(config.class2VoluntaryWeekly.value / 100).toFixed(2)} = £${(voluntaryAnnual / 100).toFixed(2)}/yr) to protect state pension record`,
      amount: 0,
      cite: config.class2VoluntaryWeekly.source,
    })
  }

  // --- Step 6: Section 24 residential finance cost credit ---
  const s24Base = Math.min(input.residentialFinanceCosts, propertyProfit, ani)
  const s24CreditRaw = round(config.s24CreditRate.value * s24Base)
  // Carry-forward is the pre-cap lowest-of-three remainder — computed here, before the
  // income-tax cap below, and untouched by it (see config.ts s24CreditRate.source).
  const s24CarriedForward = input.residentialFinanceCosts - s24Base

  // --- liability before the S24 cap ---
  const liabilityBeforeS24 = incomeTax + class4 + class2
  // STATUTORY RULE: the Section 24 credit is a reduction against INCOME TAX only — it never
  // offsets Class 4 or Class 2 NIC (gov.uk "how it's worked out", config.s24CreditRate.source).
  // Cap against incomeTax alone, not against liabilityBeforeS24, so the credit can never exceed
  // the income tax actually due and can never create a refund against NIC.
  const s24Credit = Math.min(s24CreditRaw, incomeTax)

  if (s24Base > 0) {
    lines.push({ label: `Section 24 finance cost credit: ${config.s24CreditRate.value * 100}% × min(finance costs, property profit, ANI)`, amount: s24Credit, cite: config.s24CreditRate.source })
  }
  if (s24CarriedForward > 0) {
    lines.push({ label: `Section 24 finance costs carried forward to next year: £${(s24CarriedForward / 100).toFixed(2)}`, amount: s24CarriedForward, cite: config.s24CreditRate.source })
  }

  const totalLiability = Math.max(0, liabilityBeforeS24 - s24Credit)

  // --- Step 7: payments on account ---
  const poaThreshold = config.poaThreshold.value
  let paymentsOnAccount: Estimate['paymentsOnAccount'] = null
  const priorYearSaBill = input.priorYearSaBill ?? 0
  if (priorYearSaBill >= poaThreshold) {
    const each = round(priorYearSaBill / 2)
    // Derive from the START year (no century hardcode): 'YYYY-YY' -> startYear = first 4 chars,
    // taxYearEndYear = startYear + 1. POA dates fall in the calendar year AFTER the tax year ends.
    const startYear = Number(input.taxYear.slice(0, 4))
    const taxYearEndYear = startYear + 1 // '2026-27' -> startYear 2026 -> taxYearEndYear 2027
    const dates: [string, string] = [`${taxYearEndYear + 1}-01-31`, `${taxYearEndYear + 1}-07-31`]
    paymentsOnAccount = { each, dates }
    lines.push({
      label: 'Payments on account forecast assumes no income is taxed at source (the 80% at-source test is not evaluated — M1 input has no at-source data)',
      amount: each,
      cite: config.poaAtSourceFraction.source,
    })
  } else if (priorYearSaBill > 0) {
    lines.push({ label: `No payments on account: prior year bill below the £${(poaThreshold / 100).toLocaleString('en-GB')} threshold`, amount: 0, cite: config.poaThreshold.source })
  }

  return {
    kind: 'estimate',
    scope: 'rUK',
    personalAllowance,
    incomeTax,
    class4,
    class2,
    s24Credit,
    s24CarriedForward,
    totalLiability,
    paymentsOnAccount,
    lines,
  }
}
