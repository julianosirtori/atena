import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import DashboardPage from '@/pages/dashboard'

describe('DashboardPage', () => {
  it('renders dashboard metrics', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(
      () => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(screen.getByText('Leads hoje')).toBeInTheDocument()
    expect(screen.getByText('Leads no mês')).toBeInTheDocument()
    expect(screen.getByText('Score médio')).toBeInTheDocument()
    expect(screen.getByText('Taxa de handoff')).toBeInTheDocument()
  })

  it('renders metric values from API', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(
      () => {
        expect(screen.getByText('Leads hoje')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    // leadsToday = 5
    expect(screen.getByText('5')).toBeInTheDocument()
    // leadsMonth = 42 appears in MetricCard and LeadsProgress
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1)
  })
})
