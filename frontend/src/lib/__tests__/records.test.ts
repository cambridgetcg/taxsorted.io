import { describe, it, expect } from 'vitest'
import { createRecordsStore } from '../records'

describe('records store', () => {
  it('adds, lists, removes, round-trips', async () => {
    const s = createRecordsStore(new Map())
    const r = await s.add({ date: '2026-05-01', amount: 12345, kind: 'income', category: 'turnover', source: 'self-employment' })
    expect(r.id).toBeTruthy()
    expect(await s.list()).toHaveLength(1)
    await s.remove(r.id)
    expect(await s.list()).toHaveLength(0)
  })
  it('rejects unknown categories', async () => {
    const s = createRecordsStore(new Map())
    await expect(s.add({ date: '2026-05-01', amount: 1, kind: 'expense', category: 'lambos', source: 'self-employment' })).rejects.toThrow(/unknown category/i)
  })
  it('exports CSV with headers', async () => {
    const s = createRecordsStore(new Map())
    await s.add({ date: '2026-05-01', amount: 12345, kind: 'income', category: 'turnover', source: 'self-employment' })
    const csv = await s.exportCsv()
    expect(csv.split('\n')[0]).toBe('date,kind,category,amount,source,description')
    expect(csv).toContain('2026-05-01,income,turnover,123.45,self-employment,')
  })
  it('rejects non-integer or non-positive amounts', async () => {
    const s = createRecordsStore(new Map())
    const base = { date: '2026-05-01', kind: 'income', category: 'turnover', source: 'self-employment' } as const
    await expect(s.add({ ...base, amount: 12.5 })).rejects.toThrow(/invalid amount/i)
    await expect(s.add({ ...base, amount: 0 })).rejects.toThrow(/invalid amount/i)
    await expect(s.add({ ...base, amount: -100 })).rejects.toThrow(/invalid amount/i)
    expect(await s.list()).toHaveLength(0)
  })
  // Same-tab interleaving only: cross-tab sync (BroadcastChannel/storage events) is a known M2 item.
  it('does not lose updates when add and remove race', async () => {
    // Mimics idb-keyval's real behaviour: async latency + copy-on-read, so two
    // unserialized read-modify-writes would each start from the same snapshot
    // and the later write would silently erase the earlier one.
    const stored = new Map<string, unknown>()
    const wait = () => new Promise((r) => setTimeout(r, 5))
    const backend = {
      get: async (key: string) => {
        await wait()
        return stored.has(key) ? structuredClone(stored.get(key)) : undefined
      },
      set: async (key: string, value: unknown) => {
        await wait()
        stored.set(key, structuredClone(value))
      },
      delete: (key: string) => stored.delete(key),
    }
    const s = createRecordsStore(backend)
    const existing = await s.add({ date: '2026-05-01', amount: 100, kind: 'income', category: 'turnover', source: 'self-employment' })
    const [added] = await Promise.all([
      s.add({ date: '2026-05-02', amount: 200, kind: 'income', category: 'turnover', source: 'self-employment' }),
      s.remove(existing.id),
    ])
    // BOTH operations must have taken effect: the new record is there, the removed one is gone.
    const after = await s.list()
    expect(after.map((r) => r.id)).toEqual([added.id])
  })
  it('returns copies from list() — mutating them cannot corrupt the store', async () => {
    const s = createRecordsStore(new Map())
    await s.add({ date: '2026-05-01', amount: 12345, kind: 'income', category: 'turnover', source: 'self-employment' })
    const first = await s.list()
    first[0].amount = 999999
    first.pop()
    const again = await s.list()
    expect(again).toHaveLength(1)
    expect(again[0].amount).toBe(12345)
  })
})
