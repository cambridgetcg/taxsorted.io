import { describe, it, expect } from 'vitest'
import { quartersFor, quarterForDate, penaltyPosition } from '../periods'

describe('ITSA quarters 2026-27', () => {
  it('standard quarters are cumulative with 7th-of-month deadlines', () => {
    const q = quartersFor('2026-27', 'standard')
    expect(q).toHaveLength(4)
    expect(q[0]).toEqual({ index: 1, periodStart: '2026-04-06', periodEnd: '2026-07-05', cumulativeStart: '2026-04-06', deadline: '2026-08-07' })
    expect(q[1].periodEnd).toBe('2026-10-05'); expect(q[1].deadline).toBe('2026-11-07')
    expect(q[2].periodEnd).toBe('2027-01-05'); expect(q[2].deadline).toBe('2027-02-07')
    expect(q[3].periodEnd).toBe('2027-04-05'); expect(q[3].deadline).toBe('2027-05-07')
    expect(q[3].cumulativeStart).toBe('2026-04-06')
  })
  it('calendar election shifts period edges, keeps deadlines', () => {
    const q = quartersFor('2026-27', 'calendar')
    expect(q[0].periodStart).toBe('2026-04-01'); expect(q[0].periodEnd).toBe('2026-06-30')
    expect(q[0].deadline).toBe('2026-08-07')
    expect(q[3].periodEnd).toBe('2027-03-31'); expect(q[3].deadline).toBe('2027-05-07')
  })
  it('maps a date to its quarter', () => {
    expect(quarterForDate('2026-09-30', '2026-27', 'standard')!.index).toBe(2)
    expect(quarterForDate('2026-04-03', '2026-27', 'standard')).toBeNull() // before year start
  })
  it('knows 2026-27 waives quarterly penalty points', () => {
    const p = penaltyPosition('2026-27')
    expect(p.quarterlyPoints).toBe(false)
    expect(p.note).toMatch(/late payment/i) // the note must keep the true sting visible
  })
})
