// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WhoRunsYourTaxes from '../who-runs-your-taxes/page'
import { RoleCard } from '@/components/gov/role-card'
import { ROLES } from '@/lib/gov/contacts'

describe('who runs your taxes', () => {
  it('has the h1', () => {
    render(<WhoRunsYourTaxes />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/who runs your taxes/i)
  })

  it('carries the anti-phishing callout above the contact table', () => {
    render(<WhoRunsYourTaxes />)
    expect(screen.getByText(/HMRC will never/i)).toBeInTheDocument()
    expect(screen.getByText(/routes for you to contact them/i)).toBeInTheDocument()
  })

  it('shows the anti-phishing callout before the contact table in document order', () => {
    const { container } = render(<WhoRunsYourTaxes />)
    const text = container.textContent ?? ''
    const phishingIdx = text.search(/HMRC will never/i)
    const tableIdx = text.indexOf('Self Assessment (sole traders, landlords)')
    expect(phishingIdx).toBeGreaterThan(-1)
    expect(tableIdx).toBeGreaterThan(-1)
    expect(phishingIdx).toBeLessThan(tableIdx)
  })

  it('renders at least one role card with "as of" text', () => {
    render(<WhoRunsYourTaxes />)
    expect(screen.getAllByText(/as of \d{4}-\d{2}-\d{2}/i).length).toBeGreaterThan(0)
  })

  it('renders the complaints ladder in order: Tier 1, Tier 2, Adjudicator, Ombudsman', () => {
    const { container } = render(<WhoRunsYourTaxes />)
    const steps = Array.from(container.querySelectorAll('[data-step]')).map((el) =>
      el.getAttribute('data-step'),
    )
    expect(steps).toEqual(['tier-1', 'tier-2', 'adjudicator', 'ombudsman'])

    const ladder = container.querySelector('ol')
    expect(ladder).not.toBeNull()
    const ladderText = ladder!.textContent ?? ''
    const tier1 = ladderText.indexOf('Tier 1')
    const tier2 = ladderText.indexOf('Tier 2')
    const adjudicator = ladderText.indexOf('Adjudicator')
    const ombudsman = ladderText.search(/ombudsman/i)
    expect(tier1).toBeGreaterThan(-1)
    expect(tier2).toBeGreaterThan(tier1)
    expect(adjudicator).toBeGreaterThan(tier2)
    expect(ombudsman).toBeGreaterThan(adjudicator)
  })

  it('carries the wrong-door box, inverted: this page is the individual-dispute door, policy forwards to your-levers', () => {
    render(<WhoRunsYourTaxes />)
    expect(screen.getByText(/about tax policy/i)).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /your levers/i })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/learn/gov/your-levers')
    }
  })

  it('carries the SAR-vs-FOI passage', () => {
    render(<WhoRunsYourTaxes />)
    expect(screen.getAllByText(/subject access request/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\bSAR\b/).length).toBeGreaterThan(0)
  })

  it('never says a figure is "HMRC approved"', () => {
    render(<WhoRunsYourTaxes />)
    expect(document.body.textContent).not.toMatch(/HMRC.approved/i)
  })

  describe('RoleCard staleness badge (hydration-gated)', () => {
    const role = ROLES.find((r) => r.holder)!

    it('shows no re-verify badge when "today" is within 90 days of verifiedOn', () => {
      render(<RoleCard role={role} today={role.verifiedOn} />)
      expect(screen.queryByText(/re-verify/i)).not.toBeInTheDocument()
    })

    it('shows an amber re-verify badge once "today" is injected far enough past verifiedOn', () => {
      render(<RoleCard role={role} today="2026-11-01" />)
      expect(screen.getByText(/re-verify/i)).toBeInTheDocument()
    })

    it('always shows the holder and "as of" date regardless of staleness', () => {
      render(<RoleCard role={role} today="2026-11-01" />)
      expect(screen.getByText(new RegExp(`as of ${role.holder!.asOf}`, 'i'))).toBeInTheDocument()
    })
  })
})
