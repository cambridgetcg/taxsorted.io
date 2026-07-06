// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HowTaxLawIsMade from '../how-tax-law-is-made/page'

describe('how a tax law is born', () => {
  it('has the h1', () => {
    render(<HowTaxLawIsMade />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /how a tax law is (born|made)/i,
    )
  })

  it('carries the PCTA 1968 pay-before-law surprise', () => {
    render(<HowTaxLawIsMade />)
    expect(screen.getByText(/before the law exists/i)).toBeInTheDocument()
  })

  it('links to legislation.gov.uk at least twice', () => {
    render(<HowTaxLawIsMade />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    const legislationLinks = links.filter((a) => a.href.includes('legislation.gov.uk'))
    expect(legislationLinks.length).toBeGreaterThanOrEqual(2)
  })

  it('carries the wrong-door box routing individual disputes to the complaints guide', () => {
    render(<HowTaxLawIsMade />)
    expect(screen.getByText(/dispute, not policy/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /who runs your taxes/i })
    expect(link).toHaveAttribute('href', '/learn/gov/who-runs-your-taxes')
  })

  it('carries the devolution note with corpus-sourced Scottish/Welsh links', () => {
    render(<HowTaxLawIsMade />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(links.some((a) => a.href.includes('gov.uk/scottish-income-tax'))).toBe(true)
    expect(links.some((a) => a.href.includes('gov.uk/welsh-income-tax'))).toBe(true)
  })

  it('carries the NICs-don\'t-ride-the-Finance-Bill note', () => {
    render(<HowTaxLawIsMade />)
    expect(screen.getByText(/National Insurance Bill/i)).toBeInTheDocument()
  })

  it('never says a figure is "HMRC approved"', () => {
    render(<HowTaxLawIsMade />)
    expect(document.body.textContent).not.toMatch(/HMRC.approved/i)
  })
})
