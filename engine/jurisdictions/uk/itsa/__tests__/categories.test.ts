import { describe, it, expect } from 'vitest'
import { SE_CATEGORIES, PROPERTY_CATEGORIES, categoriesFor, categoryByKey } from '../categories'

describe('MTD categories', () => {
  it('SE: 2 income + 15 expense fields', () => {
    expect(SE_CATEGORIES.filter(c => c.kind === 'income').map(c => c.key)).toEqual(['turnover', 'other'])
    expect(SE_CATEGORIES.filter(c => c.kind === 'expense')).toHaveLength(15)
    expect(categoryByKey('carVanTravelExpenses').saBox).toBe('SA103F box 20')
  })
  it('property: 4 income + 10 expense fields, S24 field always separate', () => {
    expect(PROPERTY_CATEGORIES.filter(c => c.kind === 'income')).toHaveLength(4)
    const s24 = categoryByKey('residentialFinancialCost')
    expect(s24.alwaysSeparate).toBe(true)
  })
  it('consolidated view collapses consolidatable expenses but keeps residentialFinancialCost', () => {
    const cons = categoriesFor('uk-property', { consolidated: true })
    expect(cons.map(c => c.key)).toContain('consolidatedExpenses')
    expect(cons.map(c => c.key)).toContain('residentialFinancialCost')
    expect(cons.map(c => c.key)).not.toContain('repairsAndMaintenance')
  })
  it('every category has a plain-words line', () => {
    for (const c of [...SE_CATEGORIES, ...PROPERTY_CATEGORIES]) expect(c.plain.length).toBeGreaterThan(10)
  })
})

describe('categoryByKey disambiguation', () => {
  it('throws on an ambiguous key without a source', () => {
    expect(() => categoryByKey('other')).toThrow(/ambiguous/)
  })
  it('resolves SE "other" as income (Other business income)', () => {
    const c = categoryByKey('other', 'self-employment')
    expect(c.source).toBe('self-employment')
    expect(c.kind).toBe('income')
  })
  it('resolves property "other" as expense (Other allowable property expenses)', () => {
    const c = categoryByKey('other', 'uk-property')
    expect(c.source).toBe('uk-property')
    expect(c.kind).toBe('expense')
  })
})
