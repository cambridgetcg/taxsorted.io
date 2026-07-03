import { describe, it, expect } from 'vitest'
import { parseCsv, guessMapping, suggestCategory, toRecords } from '../csv-import'

const BANK = 'Date,Description,Amount\n01/05/2026,"CLIENT PAYMENT, INV-12",1500.00\n03/05/2026,SHELL PETROL,-45.50\n04/05/2026,garbage,notanumber'

describe('csv import', () => {
  it('parses RFC4180 quoted fields', () => {
    const p = parseCsv(BANK)
    expect(p.rows[0][1]).toBe('CLIENT PAYMENT, INV-12')
  })
  it('guesses the mapping from bank-style headers', () => {
    expect(guessMapping(['Date', 'Description', 'Amount'])).toEqual({ date: 'Date', amount: 'Amount', description: 'Description' })
  })
  it('suggests fuel → carVanTravelExpenses', () => {
    expect(suggestCategory('SHELL PETROL', 'self-employment')).toBe('carVanTravelExpenses')
  })
  it('converts rows: sign → kind, dd/mm/yyyy → ISO, bad rows warned not thrown', () => {
    const out = toRecords(parseCsv(BANK), { date: 'Date', amount: 'Amount', description: 'Description' }, 'self-employment')
    expect(out[0].record).toMatchObject({ date: '2026-05-01', amount: 150000, kind: 'income' })
    expect(out[1].record).toMatchObject({ date: '2026-05-03', amount: 4550, kind: 'expense', category: 'carVanTravelExpenses' })
    expect(out[2].warning).toMatch(/amount/i)
  })
})

const MAPPING = { date: 'Date', amount: 'Amount', description: 'Description' }

describe('csv import (review-round fixes)', () => {
  it('skips fully-blank lines mid-file without phantom rows', () => {
    const p = parseCsv('Date,Description,Amount\n13/05/2026,A,1.00\n\n\n14/05/2026,B,2.00\n')
    expect(p.rows).toHaveLength(2)
    const out = toRecords(p, MAPPING, 'self-employment')
    expect(out.every((r) => !r.warning)).toBe(true)
  })
  it('soft-warns a dd/mm date that could also be US MM/DD', () => {
    const out = toRecords(parseCsv('Date,Description,Amount\n01/05/2026,A,1.00'), MAPPING, 'self-employment')
    expect(out[0].record.date).toBe('2026-05-01') // still read as DD/MM
    expect(out[0].warning).toMatch(/US-format MM\/DD/i)
  })
  it('does not call unambiguous dates ambiguous', () => {
    const csv = 'Date,Description,Amount\n13/05/2026,A,1.00\n05/05/2026,B,1.00\n2026-05-01,C,1.00'
    const out = toRecords(parseCsv(csv), MAPPING, 'self-employment')
    expect(out[0].warning).toBeUndefined() // 13 can only be a day
    expect(out[1].warning).toBeUndefined() // 05/05 is the same date either way
    expect(out[2].warning).toBeUndefined() // ISO is never ambiguous
  })
  it('warns when a keyword-matched category is auto-adjusted to match the sign', () => {
    // "RENT RECEIVED" hits the rent keyword (an expense category) but the amount is positive
    const out = toRecords(parseCsv('Date,Description,Amount\n13/05/2026,RENT RECEIVED,500.00'), MAPPING, 'uk-property')
    expect(out[0].record).toMatchObject({ kind: 'income', category: 'periodAmount' })
    expect(out[0].warning).toMatch(/auto-adjusted/i)
  })
  it('does not warn a plain income row that matched no keyword', () => {
    const out = toRecords(parseCsv('Date,Description,Amount\n13/05/2026,CLIENT PAYMENT,500.00'), MAPPING, 'self-employment')
    expect(out[0].record).toMatchObject({ kind: 'income', category: 'turnover' })
    expect(out[0].warning).toBeUndefined()
  })
})
