export type Pence = number // integer; £1 = 100
export type TaxYear = `${number}-${number}` // '2026-27'
export type SourceType = 'self-employment' | 'uk-property'
export interface Cited<T> { value: T; source: string; si?: string; effectiveFrom: string; note?: string }
export interface LedgerRecord {
  id: string
  date: string          // ISO yyyy-mm-dd
  amount: Pence         // positive; direction comes from kind
  kind: 'income' | 'expense'
  category: string      // CategoryKey from categories.ts
  source: SourceType
  description?: string
}
