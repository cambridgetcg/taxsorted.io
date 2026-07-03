import type { Cited, Pence, TaxYear } from './types'

const GOVUK = {
  rates: 'https://www.gov.uk/income-tax-rates',
  nics: 'https://www.gov.uk/self-employed-national-insurance-rates',
  mileage: 'https://www.gov.uk/government/publications/increase-to-approved-mileage-allowance-payments-amaps-and-self-employed-simplified-mileage-rates/increasing-mileage-rates',
  simplified: 'https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles',
  wfh: 'https://www.gov.uk/simpler-income-tax-simplified-expenses/working-from-home',
  premises: 'https://www.gov.uk/simpler-income-tax-simplified-expenses/living-at-your-business-premises',
  allowances: 'https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income',
  rentaroom: 'https://www.gov.uk/rent-room-in-your-home/the-rent-a-room-scheme',
  s24: 'https://www.gov.uk/guidance/changes-to-tax-relief-for-residential-landlords-how-its-worked-out-including-case-studies',
  cashBasis: 'https://www.gov.uk/simpler-income-tax-cash-basis',
  poa: 'https://www.gov.uk/understand-self-assessment-bill/payments-on-account',
  digitalRecords: 'https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/keep-digital-records',
  eligibility: 'https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax',
  si2026_336: 'https://www.legislation.gov.uk/uksi/2026/336/made',
} as const

const cited = <T>(value: T, source: string, effectiveFrom: string, si?: string, note?: string): Cited<T> =>
  ({ value, source, effectiveFrom, ...(si ? { si } : {}), ...(note ? { note } : {}) })

export interface MtdThresholdStep { qualifyingIncomeOver: Pence; incomeYear: TaxYear; mandatedFrom: string }

export interface ItsaYearConfig {
  taxYear: TaxYear
  personalAllowance: Cited<Pence>
  paTaperThreshold: Cited<Pence>
  basicRateBand: Cited<Pence>
  basicRate: Cited<number>
  higherRateLimit: Cited<Pence>
  higherRate: Cited<number>
  additionalRate: Cited<number>
  class4LowerLimit: Cited<Pence>
  class4UpperLimit: Cited<Pence>
  class4MainRate: Cited<number>
  class4UpperRate: Cited<number>
  class2SmallProfitsThreshold: Cited<Pence>
  class2VoluntaryWeekly: Cited<Pence>
  mileageFirst10k: Cited<number>   // pence per mile
  mileageAfter10k: Cited<number>
  mileageMotorcycle: Cited<number>
  wfhFlatRates: Cited<Array<{ minHours: number; maxHours: number | null; monthly: Pence }>>
  premisesFlatRates: Cited<Array<{ people: number; monthly: Pence }>>
  tradingAllowance: Cited<Pence>
  propertyAllowance: Cited<Pence>
  rentARoom: Cited<Pence>
  rentARoomShared: Cited<Pence>
  propertyCashBasisLimit: Cited<Pence>
  s24CreditRate: Cited<number>
  consolidatedExpensesTurnoverLimit: Cited<Pence>
  poaThreshold: Cited<Pence>
  poaAtSourceFraction: Cited<number>
  mtdThresholds: Cited<MtdThresholdStep[]>
}

export const YEAR_2026_27: ItsaYearConfig = {
  taxYear: '2026-27',
  personalAllowance: cited(1257000, GOVUK.rates, '2026-04-06', undefined, 'frozen through 2030-31 (Budget 2025)'),
  paTaperThreshold: cited(10000000, GOVUK.rates, '2026-04-06', undefined, '£1 lost per £2 of adjusted net income above'),
  basicRateBand: cited(3770000, GOVUK.rates, '2026-04-06'),
  basicRate: cited(0.20, GOVUK.rates, '2026-04-06'),
  higherRateLimit: cited(12514000, GOVUK.rates, '2026-04-06'),
  higherRate: cited(0.40, GOVUK.rates, '2026-04-06'),
  additionalRate: cited(0.45, GOVUK.rates, '2026-04-06'),
  class4LowerLimit: cited(1257000, GOVUK.nics, '2026-04-06'),
  class4UpperLimit: cited(5027000, GOVUK.nics, '2026-04-06'),
  class4MainRate: cited(0.06, GOVUK.nics, '2026-04-06'),
  class4UpperRate: cited(0.02, GOVUK.nics, '2026-04-06'),
  class2SmallProfitsThreshold: cited(710500, GOVUK.nics, '2026-04-06', undefined, 'treated as paid at or above; voluntary below'),
  class2VoluntaryWeekly: cited(365, GOVUK.nics, '2026-04-06'),
  mileageFirst10k: cited(55, GOVUK.mileage, '2026-04-06', undefined, 'raised from 45p on 17 June 2026, retrospective to 6 April 2026'),
  mileageAfter10k: cited(25, GOVUK.simplified, '2026-04-06'),
  mileageMotorcycle: cited(24, GOVUK.simplified, '2026-04-06'),
  wfhFlatRates: cited([
    { minHours: 25, maxHours: 50, monthly: 1000 },
    { minHours: 51, maxHours: 100, monthly: 1800 },
    { minHours: 101, maxHours: null, monthly: 2600 },
  ], GOVUK.wfh, '2026-04-06'),
  premisesFlatRates: cited([
    { people: 1, monthly: 35000 },
    { people: 2, monthly: 50000 },
    { people: 3, monthly: 65000 },
  ], GOVUK.premises, '2026-04-06', undefined, '3 means 3 or more; deducted from actual costs as personal use'),
  tradingAllowance: cited(100000, GOVUK.allowances, '2026-04-06'),
  propertyAllowance: cited(100000, GOVUK.allowances, '2026-04-06'),
  rentARoom: cited(750000, GOVUK.rentaroom, '2026-04-06'),
  rentARoomShared: cited(375000, GOVUK.rentaroom, '2026-04-06'),
  propertyCashBasisLimit: cited(15000000, GOVUK.cashBasis, '2026-04-06', undefined, 'property cash basis receipts limit; trading cash basis is uncapped default from 2024-25'),
  s24CreditRate: cited(0.20, GOVUK.s24, '2026-04-06', undefined, 'credit on lowest of finance costs / property profits / adjusted total income; 22% from 2027-28 (announced)'),
  consolidatedExpensesTurnoverLimit: cited(9000000, GOVUK.digitalRecords, '2026-04-06', undefined, 'residentialFinancialCost must stay separate even when consolidating'),
  poaThreshold: cited(100000, GOVUK.poa, '2026-04-06'),
  poaAtSourceFraction: cited(0.8, GOVUK.poa, '2026-04-06'),
  mtdThresholds: cited([
    { qualifyingIncomeOver: 5000000, incomeYear: '2024-25', mandatedFrom: '2026-04-06' },
    { qualifyingIncomeOver: 3000000, incomeYear: '2025-26', mandatedFrom: '2027-04-06' },
    { qualifyingIncomeOver: 2000000, incomeYear: '2026-27', mandatedFrom: '2028-04-06' },
  ], GOVUK.si2026_336, '2026-04-06', 'SI 2026/336 reg 27'),
}

const YEARS: Record<string, ItsaYearConfig> = { '2026-27': YEAR_2026_27 }

export function configFor(taxYear: TaxYear): ItsaYearConfig {
  const c = YEARS[taxYear]
  if (!c) throw new Error(`no config for tax year ${taxYear}`)
  return c
}
