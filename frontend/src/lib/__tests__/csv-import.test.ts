import { describe, it, expect } from 'vitest'
import { csvImportId, parseCsv, guessMapping, suggestCategory, toRecords } from '../csv-import'

const BANK = 'Date,Description,Amount\n01/05/2026,"CLIENT PAYMENT, INV-12",1500.00\n03/05/2026,SHELL PETROL,-45.50\n04/05/2026,garbage,notanumber'

describe('csv import', () => {
  it('gives the same file content a stable SHA-256 import identity', async () => {
    const first = await csvImportId(BANK)
    const second = await csvImportId(BANK)
    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })
  it('parses RFC4180 quoted fields', () => {
    const p = parseCsv(BANK)
    expect(p.rows[0][1]).toBe('CLIENT PAYMENT, INV-12')
  })
  it('guesses the mapping from bank-style headers', () => {
    expect(guessMapping(['Date', 'Description', 'Amount'])).toEqual({ date: 'Date', amount: 'Amount', description: 'Description' })
  })
  it('does not guess Debit or Credit as one signed amount column', () => {
    expect(guessMapping(['Date', 'Description', 'Debit', 'Credit'])).toBeNull()
    expect(guessMapping(['Date', 'Credit', 'Signed Amount'])).toEqual({ date: 'Date', amount: 'Signed Amount' })
  })
  it('rejects an explicitly selected Debit or Credit column', () => {
    for (const amount of ['Debit', 'Credit Amount']) {
      const [row] = toRecords(
        parseCsv(`Date,${amount}\n13/05/2026,-45.00`),
        { date: 'Date', amount },
        'self-employment',
      )
      expect(row.record.amount).toBe(0)
      expect(row.warning).toMatch(/Separate Debit and Credit columns are not supported yet/i)
      expect(row.warning).toMatch(/positive means money in and negative means money out/i)
    }
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
  it('keeps file and row evidence outside the tax-engine record', () => {
    const [row] = toRecords(
      parseCsv('Date,Description,Amount\n13/05/2026,CLIENT PAYMENT,500.00'),
      MAPPING,
      'self-employment',
      { importId: 'abc', fileName: 'bank.csv' },
    )
    expect(row.record).toEqual(expect.objectContaining({ category: 'turnover' }))
    expect(row.record).not.toHaveProperty('origin')
    expect(row.importDetails?.origin).toMatchObject({
      kind: 'bank-csv', accountScope: 'csv:abc', externalId: 'abc:row-2', label: 'bank.csv', row: 2,
    })
    expect(row.importDetails?.contentDigest).toContain('"date":"2026-05-13"')
    expect(row.importDetails?.contentDigest).toContain('"amount":50000')
  })
  it('keeps file-and-row identity stable while mapped facts change the content digest', () => {
    const parsed = parseCsv('Date,Description,Amount\n13/05/2026,CLIENT PAYMENT,500.00')
    const context = { importId: 'abc', fileName: 'bank.csv' }
    const [trade] = toRecords(parsed, MAPPING, 'self-employment', context)
    const [property] = toRecords(parsed, MAPPING, 'uk-property', context)

    expect(trade.importDetails?.origin.externalId).toBe('abc:row-2')
    expect(property.importDetails?.origin.externalId).toBe('abc:row-2')
    expect(trade.importDetails?.contentDigest).not.toBe(property.importDetails?.contentDigest)
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
  it('carries a soft warning into the staged event details for Money Inbox', () => {
    const [row] = toRecords(
      parseCsv('Date,Description,Amount\n01/05/2026,A,1.00'),
      MAPPING,
      'self-employment',
      { importId: 'ambiguous', fileName: 'bank.csv' },
    )
    expect(row.importDetails?.reviewNote).toMatch(/US-format MM\/DD/i)
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
