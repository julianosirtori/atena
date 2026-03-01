import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import LeadsPage from '@/pages/leads'

describe('LeadsPage', () => {
  it('renders page header', async () => {
    renderWithProviders(<LeadsPage />)
    await waitFor(() => {
      expect(screen.getByText('Leads')).toBeInTheDocument()
    })
  })

  it('renders search input', async () => {
    renderWithProviders(<LeadsPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar lead...')).toBeInTheDocument()
    })
  })

  it('renders lead data from API', async () => {
    renderWithProviders(<LeadsPage />)
    await waitFor(
      () => {
        // Lead name appears in both mobile card and desktop table views
        const matches = screen.getAllByText('Lead Teste')
        expect(matches.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 5000 },
    )
  })
})
