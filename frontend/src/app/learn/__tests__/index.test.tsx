// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LearnPage from '../page'

describe('learn index', () => {
  it('still has the h1 and the existing MTD de-panic card', () => {
    render(<LearnPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/learn/i)
    const dePanic = screen.getByRole('link', { name: /don.t panic/i })
    expect(dePanic).toHaveAttribute('href', '/learn/mtd-income-tax')
  })

  it('has a "The tax state, explained" section with all four gov guide cards', () => {
    render(<LearnPage />)
    expect(screen.getByText(/the tax state, explained/i)).toBeInTheDocument()

    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    const hrefs = links.map((a) => a.getAttribute('href'))

    expect(hrefs).toContain('/learn/gov/how-tax-law-is-made')
    expect(hrefs).toContain('/learn/gov/who-runs-your-taxes')
    expect(hrefs).toContain('/learn/gov/your-levers')
    expect(hrefs).toContain('/learn/gov/receipts')
  })

  it('gives the receipts card its honest one-liner', () => {
    render(<LearnPage />)
    expect(screen.getByText(/when pressure on tax policy actually worked.*with sources/i)).toBeInTheDocument()
  })

  it('links to the evidence-bounded Window Tax story', () => {
    render(<LearnPage />)
    expect(screen.getByText(/taxes leave marks/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /window tax: what the evidence actually shows/i }))
      .toHaveAttribute('href', '/learn/history/window-tax')
  })

  it('updates the "more coming" note to name the M2 devolved-taxes backlog', () => {
    render(<LearnPage />)
    const note = screen.getByText(/more guides are coming/i)
    expect(note.textContent).toMatch(/devolved taxes in full/i)
    expect(note.textContent).toMatch(/northern ireland/i)
    expect(note.textContent).toMatch(/welsh-language/i)
  })
})
