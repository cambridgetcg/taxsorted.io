// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import YourLevers from '../your-levers/page'

describe('your levers on tax policy', () => {
  it('has the h1', () => {
    render(<YourLevers />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/your levers/i)
  })

  it('links to the official MP finder and WriteToThem', () => {
    render(<YourLevers />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(links.some((a) => a.href.includes('members.parliament.uk/FindYourMP'))).toBe(true)
    expect(links.some((a) => a.href.includes('writetothem.com'))).toBe(true)
  })

  it('links to WhatDoTheyKnow for FOI', () => {
    render(<YourLevers />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(links.some((a) => a.href.includes('whatdotheyknow.com'))).toBe(true)
  })

  it('carries the taxpayer-confidentiality carve-out passage', () => {
    render(<YourLevers />)
    expect(screen.getAllByText(/will never release/i).length).toBeGreaterThan(0)
  })

  it('cross-links a subject access request to who-runs-your-taxes for FOI-vs-own-data', () => {
    render(<YourLevers />)
    expect(screen.getAllByText(/subject access request/i).length).toBeGreaterThan(0)
  })

  it('carries the Finance Bill Public Bill Committee written-evidence email route', () => {
    render(<YourLevers />)
    expect(screen.getByText(/scrutiny@parliament\.uk/i)).toBeInTheDocument()
    // The corrected corpus fact: department correspondence does NOT count as PBC evidence.
    expect(screen.getByText(/not treated as evidence/i)).toBeInTheDocument()
  })

  it('links to the Treasury Committee and shows a role card for it', () => {
    render(<YourLevers />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(
      links.some((a) => a.href.includes('committees.parliament.uk/committee/158/treasury-committee')),
    ).toBe(true)
    expect(screen.getByText(/Chair, Treasury Committee/i)).toBeInTheDocument()
  })

  it('carries the Budget representations route to HM Treasury', () => {
    render(<YourLevers />)
    expect(screen.getByText(/public\.enquiries@hmtreasury\.gov\.uk/i)).toBeInTheDocument()
    expect(screen.getByText(/will not receive a bespoke written reply/i)).toBeInTheDocument()
  })

  it('carries honest petition thresholds and the honest track-record line', () => {
    render(<YourLevers />)
    expect(screen.getAllByText(/10,000 signatures/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/100,000 signatures/i).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/no recent tax petition has by itself changed tax policy/i),
    ).toBeInTheDocument()
  })

  it('carries the consultations evidence-over-opinion tip cited to the Tax Policy Making Principles', () => {
    render(<YourLevers />)
    expect(screen.getByText(/evidence of impact beats opinion/i)).toBeInTheDocument()
  })

  it('carries the transparency toolbox: TheyWorkForYou, legislation.gov.uk explanatory memoranda, organograms', () => {
    render(<YourLevers />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(links.some((a) => a.href.includes('theyworkforyou.com'))).toBe(true)
    expect(links.some((a) => a.href.includes('legislation.gov.uk'))).toBe(true)
    expect(links.some((a) => a.href.includes('data.gov.uk') && a.href.includes('organogram'))).toBe(
      true,
    )
  })

  it('carries the wrong-door box linking to who-runs-your-taxes', () => {
    render(<YourLevers />)
    expect(screen.getByText(/individual dispute/i)).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /who runs your taxes/i })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/learn/gov/who-runs-your-taxes')
    }
  })

  it('carries the civility / realistic-expectations passage (evidence beats identical letters)', () => {
    render(<YourLevers />)
    expect(screen.getAllByText(/identikit/i).length).toBeGreaterThan(0)
  })

  it('states political neutrality — levers work for any position, no cause endorsed', () => {
    render(<YourLevers />)
    expect(screen.getByText(/any position/i)).toBeInTheDocument()
  })

  it('never says a figure is "HMRC approved"', () => {
    render(<YourLevers />)
    expect(document.body.textContent).not.toMatch(/HMRC.approved/i)
  })
})
