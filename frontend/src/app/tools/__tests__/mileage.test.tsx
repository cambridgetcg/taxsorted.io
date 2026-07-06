// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configFor } from '@taxsorted/engine/uk/itsa'
import MileagePage from '../mileage/page'

describe('mileage tool', () => {
  it('computes 12,000 miles at the NEW 55p rate and says why', () => {
    render(<MileagePage />)
    fireEvent.change(screen.getByLabelText(/business miles/i), { target: { value: '12000' } })
    expect(screen.getByText('£6,000')).toBeInTheDocument()
    expect(screen.getByText(/55p/)).toBeInTheDocument()
    expect(screen.getByText(/was 45p/i)).toBeInTheDocument() // the market-is-wrong teaching hook
  })

  it('hides the 45p rate-rise callout for motorcycles — the 24p rate never changed', () => {
    render(<MileagePage />)
    fireEvent.click(screen.getByRole('radio', { name: /motorcycle/i }))
    expect(screen.queryByText(/was 45p/i)).toBeNull()
  })

  it('cites both tier sources when miles cross the 10,000 threshold', () => {
    const config = configFor('2026-27')
    render(<MileagePage />)
    fireEvent.change(screen.getByLabelText(/business miles/i), { target: { value: '12000' } })
    // each tier's rate carries its own Cited disclosure — open them all
    for (const toggle of screen.getAllByRole('button', { name: /show source/i })) {
      fireEvent.click(toggle)
    }
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining([config.mileageFirst10k.source, config.mileageAfter10k.source])
    )
  })
})
