// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuarterCard } from '../quarter-card'

describe('quarter card', () => {
  const records = [
    { id: '1', date: '2026-05-01', amount: 750000, kind: 'income' as const, category: 'turnover', source: 'self-employment' as const },
    { id: '2', date: '2026-06-01', amount: 40000, kind: 'expense' as const, category: 'carVanTravelExpenses', source: 'self-employment' as const },
  ]
  it('shows cumulative category totals with the HMRC label', () => {
    render(<QuarterCard records={records} source="self-employment" taxYear="2026-27" quarterIndex={1} election="standard" />)
    expect(screen.getByText('Turnover')).toBeInTheDocument()
    expect(screen.getByText('£7,500.00')).toBeInTheDocument()
    expect(screen.getByText(/Car, van and travel/)).toBeInTheDocument()
    expect(screen.getByText(/7 August 2026/)).toBeInTheDocument()
  })
  it('always shows the honest penalty position', () => {
    render(<QuarterCard records={records} source="self-employment" taxYear="2026-27" quarterIndex={1} election="standard" />)
    expect(screen.getByText(/no penalty points/i)).toBeInTheDocument()
    expect(screen.getByText(/late.payment/i)).toBeInTheDocument()
  })
})
