// MTD digital-record categories for Income Tax Self Assessment (self-employment + UK property).
//
// These `key` values ARE the HMRC API field names (wire format), not display strings — the
// Self Employment Business API (v5.0) and Property Business API (v6.0) read and write these
// exact names in period summaries. A typo here is a wire-format bug, not a copy-editing one.
//
// CAVEAT: the Property Business API v6.0 is beta and post-dates the FHL abolition; its field
// names below are carried forward from the 2025-26 (v1) mapping CSV, not re-verified against
// the live v6 OAS (see regs/research/substance.md §8, "MEDIUM confidence" note). If HMRC
// renames a property field, THIS FILE is the single rename point — nothing downstream should
// hardcode these strings.

import type { SourceType } from './types'

export interface CategoryDef {
  key: string // our internal key = HMRC API field name where one exists
  source: SourceType
  kind: 'income' | 'expense'
  label: string // HMRC's plain-English category name (quarterly update notice)
  plain: string // TaxSorted plain-words one-liner
  saBox?: string // SA103F / SA105 box ref
  alwaysSeparate?: true // survives consolidation (residentialFinancialCost)
  consolidatable?: false // excluded from consolidatedExpenses
  taxDeductible?: false // tracked in books/updates but added back for the tax estimate
}

// Self-employment: 2 income + 15 expense fields (SA103F boxes 15-30).
// `consolidatedExpenses` (box 31) is not a member of this list — it is synthesised on demand
// by `categoriesFor(..., { consolidated: true })` and resolvable via `categoryByKey`.
export const SE_CATEGORIES: CategoryDef[] = [
  // Income
  {
    key: 'turnover',
    source: 'self-employment',
    kind: 'income',
    label: 'Turnover',
    saBox: 'SA103F box 15',
    plain: 'The money your business took in from sales before any costs are taken off.',
  },
  {
    key: 'other',
    source: 'self-employment',
    kind: 'income',
    label: 'Other business income',
    saBox: 'SA103F box 16',
    plain: 'Any other business income that is not turnover, such as grants or insurance payouts.',
  },
  // Expenses
  {
    key: 'costOfGoods',
    source: 'self-employment',
    kind: 'expense',
    label: 'Cost of goods bought for resale or goods used',
    saBox: 'SA103F box 17',
    plain: 'What you paid for the stock or materials that went into what you sold.',
  },
  {
    key: 'paymentsToSubcontractors',
    source: 'self-employment',
    kind: 'expense',
    label: 'Construction industry — payments to subcontractors',
    saBox: 'SA103F box 18',
    plain: 'What you paid subcontractors under the Construction Industry Scheme.',
  },
  {
    key: 'wagesAndStaffCosts',
    source: 'self-employment',
    kind: 'expense',
    label: 'Wages, salaries and other staff costs',
    saBox: 'SA103F box 19',
    plain: 'What you paid staff, including wages, salaries, bonuses and employer costs.',
  },
  {
    key: 'carVanTravelExpenses',
    source: 'self-employment',
    kind: 'expense',
    label: 'Car, van and travel expenses',
    saBox: 'SA103F box 20',
    plain: 'Running costs for the vehicles and travel you use for the business.',
  },
  {
    key: 'premisesRunningCosts',
    source: 'self-employment',
    kind: 'expense',
    label: 'Rent, rates, power and insurance costs',
    saBox: 'SA103F box 21',
    plain: 'Rent, business rates, heating, lighting and insurance for your business premises.',
  },
  {
    key: 'maintenanceCosts',
    source: 'self-employment',
    kind: 'expense',
    label: 'Repairs and maintenance of property and equipment',
    saBox: 'SA103F box 22',
    plain: 'Keeping your premises and equipment in working order, not improving them.',
  },
  {
    key: 'adminCosts',
    source: 'self-employment',
    kind: 'expense',
    label: 'Phone, fax, stationery and other office costs',
    saBox: 'SA103F box 23',
    plain: 'Everyday running costs like phone, postage, stationery and small office supplies.',
  },
  {
    key: 'advertisingCosts',
    source: 'self-employment',
    kind: 'expense',
    label: 'Advertising',
    saBox: 'SA103F box 24',
    plain: 'What you spent getting the word out about your business.',
  },
  {
    key: 'businessEntertainmentCosts',
    source: 'self-employment',
    kind: 'expense',
    label: 'Business entertainment costs',
    saBox: 'SA103F box 24',
    consolidatable: false,
    taxDeductible: false,
    plain: 'Entertaining clients or contacts — always disallowed for tax, so it is tracked apart even under simplified reporting.',
  },
  {
    key: 'interestOnBankOtherLoans',
    source: 'self-employment',
    kind: 'expense',
    label: 'Interest on bank and other loans',
    saBox: 'SA103F box 25',
    plain: 'Interest you paid on loans and overdrafts used for the business.',
  },
  {
    key: 'financeCharges',
    source: 'self-employment',
    kind: 'expense',
    label: 'Bank, credit card and other financial charges',
    saBox: 'SA103F box 26',
    plain: 'Bank charges, card fees and other costs of running business finances.',
  },
  {
    key: 'irrecoverableDebts',
    source: 'self-employment',
    kind: 'expense',
    label: 'Irrecoverable debts written off',
    saBox: 'SA103F box 27',
    plain: 'Money customers owed you that you have given up trying to collect.',
  },
  {
    key: 'professionalFees',
    source: 'self-employment',
    kind: 'expense',
    label: 'Accountancy, legal and other professional fees',
    saBox: 'SA103F box 28',
    plain: 'What you paid accountants, solicitors and other professional advisers.',
  },
  {
    key: 'depreciation',
    source: 'self-employment',
    kind: 'expense',
    label: 'Depreciation and loss/(profit) on sale of assets',
    saBox: 'SA103F box 29',
    consolidatable: false,
    taxDeductible: false,
    plain: "This is accounting wear-and-tear, not a tax expense — it's always disallowed, so it is tracked apart.",
  },
  {
    key: 'otherExpenses',
    source: 'self-employment',
    kind: 'expense',
    label: 'Other business expenses',
    saBox: 'SA103F box 30',
    plain: 'Any allowable business expense that does not fit the other categories.',
  },
]

// UK property: 4 income + 9 expense fields (SA105 boxes 20-29, 44-45).
// `consolidatedExpenses` (box 29, shared with `other`/`travelCosts`) is not a member of this
// list — it is synthesised on demand by `categoriesFor(..., { consolidated: true })` and
// resolvable via `categoryByKey`.
export const PROPERTY_CATEGORIES: CategoryDef[] = [
  // Income
  {
    key: 'periodAmount',
    source: 'uk-property',
    kind: 'income',
    label: 'Total rent',
    saBox: 'SA105 box 20',
    plain: 'The rent and related income you received from the property during the period.',
  },
  {
    key: 'otherIncome',
    source: 'uk-property',
    kind: 'income',
    label: 'Other income from property',
    saBox: 'SA105 box 20',
    plain: 'Any other income from the property that is not rent, such as a service charge.',
  },
  {
    key: 'premiumsOfLeaseGrant',
    source: 'uk-property',
    kind: 'income',
    label: 'Premiums for the grant of a lease',
    saBox: 'SA105 box 22',
    plain: 'A one-off premium you received for granting a lease on the property.',
  },
  {
    key: 'reversePremiums',
    source: 'uk-property',
    kind: 'income',
    label: 'Reverse premiums and inducements',
    saBox: 'SA105 box 23',
    plain: "A payment or incentive you received to take on a lease, such as a landlord's inducement.",
  },
  // Expenses
  {
    key: 'premisesRunningCosts',
    source: 'uk-property',
    kind: 'expense',
    label: 'Rent, rates, insurance and ground rents',
    saBox: 'SA105 box 24',
    plain: 'Rent, rates, insurance and ground rent for the property itself.',
  },
  {
    key: 'repairsAndMaintenance',
    source: 'uk-property',
    kind: 'expense',
    label: 'Property repairs and maintenance',
    saBox: 'SA105 box 25',
    plain: 'Keeping the property in good repair, not improving or extending it.',
  },
  {
    key: 'financialCosts',
    source: 'uk-property',
    kind: 'expense',
    label: 'Non-residential property finance costs',
    saBox: 'SA105 box 26',
    plain: 'Loan interest and finance costs on a non-residential property.',
  },
  {
    key: 'professionalFees',
    source: 'uk-property',
    kind: 'expense',
    label: 'Legal, management and other professional fees',
    saBox: 'SA105 box 27',
    plain: 'What you paid letting agents, solicitors and other professionals to manage or let the property.',
  },
  {
    key: 'costOfServices',
    source: 'uk-property',
    kind: 'expense',
    label: 'Costs of services provided, including wages',
    saBox: 'SA105 box 28',
    plain: 'Services you provide as part of the letting, including any staff wages.',
  },
  {
    key: 'travelCosts',
    source: 'uk-property',
    kind: 'expense',
    label: 'Travel expenses',
    saBox: 'SA105 box 29',
    plain: 'Travel costs you incur visiting or managing the property.',
  },
  {
    key: 'other',
    source: 'uk-property',
    kind: 'expense',
    label: 'Other allowable property expenses',
    saBox: 'SA105 box 29',
    plain: 'Any allowable property expense that does not fit the other categories.',
  },
  {
    key: 'residentialFinancialCost',
    source: 'uk-property',
    kind: 'expense',
    label: 'Residential property finance costs',
    saBox: 'SA105 box 44',
    alwaysSeparate: true,
    plain: 'Mortgage interest and finance costs on a residential let — restricted to a 20% tax credit (Section 24), so it is always tracked on its own.',
  },
  {
    key: 'residentialFinancialCostsCarriedForward',
    source: 'uk-property',
    kind: 'expense',
    label: 'Residential finance costs brought forward',
    saBox: 'SA105 box 45',
    alwaysSeparate: true,
    plain: 'Residential finance costs from an earlier year that you are carrying forward because they could not be used then.',
  },
]

// The consolidated-reporting field: available once turnover/receipts are under the £90,000
// digital-record threshold. Not a member of SE_CATEGORIES / PROPERTY_CATEGORIES — it only
// appears via `categoriesFor(..., { consolidated: true })` or a direct `categoryByKey` lookup.
const SE_CONSOLIDATED: CategoryDef = {
  key: 'consolidatedExpenses',
  source: 'self-employment',
  kind: 'expense',
  label: 'Consolidated expenses',
  saBox: 'SA103F box 31',
  plain: "One combined total for all your expenses — available if your turnover is under £90,000, so you don't have to split costs into categories.",
}

const PROPERTY_CONSOLIDATED: CategoryDef = {
  key: 'consolidatedExpenses',
  source: 'uk-property',
  kind: 'expense',
  label: 'Consolidated expenses',
  saBox: 'SA105 box 29',
  plain: 'One combined total for your property expenses — available under the £90,000 threshold, but residential finance costs still have to be shown separately.',
}

const listFor = (source: SourceType): CategoryDef[] =>
  source === 'self-employment' ? SE_CATEGORIES : PROPERTY_CATEGORIES

const consolidatedFor = (source: SourceType): CategoryDef =>
  source === 'self-employment' ? SE_CONSOLIDATED : PROPERTY_CONSOLIDATED

/**
 * The categories for a source, either the full itemised set (default) or the consolidated
 * view: income fields + the single `consolidatedExpenses` field + any field that always
 * survives consolidation (e.g. `residentialFinancialCost`, restricted under Section 24).
 */
export function categoriesFor(source: SourceType, opts?: { consolidated?: boolean }): CategoryDef[] {
  const all = listFor(source)
  if (!opts?.consolidated) return all // all real fields; consolidatedExpenses isn't one of them

  const income = all.filter((c) => c.kind === 'income')
  const alwaysSeparate = all.filter((c) => c.alwaysSeparate)
  return [...income, consolidatedFor(source), ...alwaysSeparate]
}

/**
 * Look up a category by its HMRC API field name. Some keys exist in BOTH the self-employment
 * and property lists (`premisesRunningCosts`, `professionalFees`, `consolidatedExpenses`,
 * `other`) — pass `source` to disambiguate. Omitting `source` for an ambiguous key throws.
 */
export function categoryByKey(key: string, source?: SourceType): CategoryDef {
  const seMatch = [...SE_CATEGORIES, SE_CONSOLIDATED].find((c) => c.key === key)
  const propertyMatch = [...PROPERTY_CATEGORIES, PROPERTY_CONSOLIDATED].find((c) => c.key === key)

  if (seMatch && propertyMatch) {
    if (!source) throw new Error(`ambiguous category: '${key}' exists in both self-employment and uk-property — pass source`)
    return source === 'self-employment' ? seMatch : propertyMatch
  }

  const found = source === 'self-employment' ? seMatch : source === 'uk-property' ? propertyMatch : seMatch ?? propertyMatch
  if (!found) throw new Error(`unknown category: '${key}'`)
  return found
}
