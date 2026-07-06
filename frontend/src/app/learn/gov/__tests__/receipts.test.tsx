// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Receipts from '../receipts/page'

describe('receipts: when pressure worked', () => {
  it('has the h1', () => {
    render(<Receipts />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/receipts/i)
  })

  it('renders at least 3 case cards, each carrying at least one source link', () => {
    const { container } = render(<Receipts />)
    const cards = Array.from(container.querySelectorAll('[data-case]'))
    expect(cards.length).toBeGreaterThanOrEqual(3)
    for (const card of cards) {
      const links = card.querySelectorAll('a[href]')
      expect(links.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('carries a case card for Making Tax Digital delays and threshold moves', () => {
    const { container } = render(<Receipts />)
    const card = container.querySelector('[data-case="mtd"]')
    expect(card).not.toBeNull()
    expect(card!.textContent).toMatch(/making tax digital/i)
    expect(card!.textContent).toMatch(/threshold/i)
  })

  it('carries a case card for the 2022 IR35 double U-turn, including the 3-week reversal', () => {
    const { container } = render(<Receipts />)
    const card = container.querySelector('[data-case="ir35"]')
    expect(card).not.toBeNull()
    expect(card!.textContent).toMatch(/ir35|off-payroll/i)
    expect(card!.textContent).toMatch(/3 weeks/i)
  })

  it('carries a case card for the HICBC 2024 threshold change', () => {
    const { container } = render(<Receipts />)
    const card = container.querySelector('[data-case="hicbc"]')
    expect(card).not.toBeNull()
    expect(card!.textContent).toMatch(/child benefit/i)
    expect(card!.textContent).toMatch(/£60,000/)
  })

  it('carries a case card for the loan charge review(s)', () => {
    const { container } = render(<Receipts />)
    const card = container.querySelector('[data-case="loan-charge"]')
    expect(card).not.toBeNull()
    expect(card!.textContent).toMatch(/loan charge/i)
  })

  it('carries the neutrality line: receipts, not endorsements, for any position', () => {
    render(<Receipts />)
    expect(screen.getByText(/receipts, not endorsements/i)).toBeInTheDocument()
    expect(screen.getByText(/same levers work for any position/i)).toBeInTheDocument()
  })

  it('highlights LITRG as the body that exists for unrepresented taxpayers', () => {
    render(<Receipts />)
    expect(screen.getAllByText(/LITRG/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/unrepresented/i).length).toBeGreaterThan(0)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(links.some((a) => a.href.includes('litrg.org.uk'))).toBe(true)
  })

  it('carries the honest calibration passage: most pressure does not work', () => {
    render(<Receipts />)
    expect(screen.getByText(/most pressure does not work/i)).toBeInTheDocument()
  })

  it('carries the wrong-door box linking to who-runs-your-taxes', () => {
    render(<Receipts />)
    expect(screen.getByText(/individual dispute/i)).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /who runs your taxes/i })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/learn/gov/who-runs-your-taxes')
    }
  })

  it('never says a figure is "HMRC approved"', () => {
    render(<Receipts />)
    expect(document.body.textContent).not.toMatch(/HMRC.approved/i)
  })
})
