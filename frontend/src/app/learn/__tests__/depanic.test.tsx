// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DePanic from '../../learn/mtd-income-tax/page'

describe('de-panic page', () => {
  it('leads with the on-ramp truth, keeps the sting visible, cites everything', () => {
    render(<DePanic />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/don.t panic/i)
    // written via the RegExp constructor, not a /.../is literal: tsconfig targets ES2017 and
    // tsc (TS1501) rejects the dotAll ('s') flag on a regex literal below ES2018 — the
    // constructor form is untyped and matches identically at runtime.
    expect(screen.getByText(new RegExp('no penalty points.*2026-27', 'is'))).toBeInTheDocument()
    expect(screen.getByText(/late.payment penalties still apply/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link').some(a => (a as HTMLAnchorElement).href.includes('legislation.gov.uk'))).toBe(true)
  })
})
