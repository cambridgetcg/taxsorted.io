// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Cited } from '../cited'
import { gbp, gbpCompact } from '@/lib/format'

describe('Cited + format', () => {
  it('formats pence to GBP', () => {
    expect(gbp(1143200)).toBe('£11,432.00')
    expect(gbpCompact(245660)).toBe('£2,456.60')
    expect(gbpCompact(600000)).toBe('£6,000')
  })
  it('reveals the source on toggle', () => {
    render(<Cited cite={{ source: 'https://www.gov.uk/income-tax-rates', effectiveFrom: '2026-04-06' }}>£12,570</Cited>)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.gov.uk/income-tax-rates')
  })
})
