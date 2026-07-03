// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EligibilityForm } from '../eligibility-form'

describe('eligibility form', () => {
  it('mandates a £55k-gross 2024-25 sole trader from 6 April 2026', () => {
    render(<EligibilityForm />)
    fireEvent.change(screen.getByLabelText(/self-employment.*2024-25/i), { target: { value: '40000' } })
    fireEvent.change(screen.getByLabelText(/property.*2024-25/i), { target: { value: '15000' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/already in — since 6 April 2026/i)).toBeInTheDocument()
  })
  it('shows below-threshold with the exemption note', () => {
    render(<EligibilityForm />)
    fireEvent.change(screen.getByLabelText(/self-employment.*2024-25/i), { target: { value: '15000' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/not required/i)).toBeInTheDocument()
    expect(screen.getByText(/exempt/i)).toBeInTheDocument()
  })
  it('sanitizes £ signs and thousands separators before parsing', () => {
    render(<EligibilityForm />)
    fireEvent.change(screen.getByLabelText(/self-employment.*2024-25/i), { target: { value: '£55,000' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/already in — since 6 April 2026/i)).toBeInTheDocument()
  })
  it('rejects non-numeric input with an inline field error and no verdict', () => {
    render(<EligibilityForm />)
    const input = screen.getByLabelText(/self-employment.*2024-25/i)
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/enter a number, like 40000 or 40,000\.50/i)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(/already in|you'll be in|not required/i)).toBeNull()
  })
  it('rejects negative amounts with an inline field error and no verdict', () => {
    render(<EligibilityForm />)
    const input = screen.getByLabelText(/property.*2024-25/i)
    fireEvent.change(input, { target: { value: '-5000' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/enter a number, like 40000 or 40,000\.50/i)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(/already in|you'll be in|not required/i)).toBeNull()
  })
  it('shows the exemptions note open by default when mandated', () => {
    render(<EligibilityForm />)
    fireEvent.change(screen.getByLabelText(/self-employment.*2024-25/i), { target: { value: '55000' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/already in — since 6 April 2026/i)).toBeInTheDocument()
    // the note's content is visible without any click on the disclosure toggle
    expect(screen.getByText(/digitally excluded/i)).toBeInTheDocument()
  })
})
