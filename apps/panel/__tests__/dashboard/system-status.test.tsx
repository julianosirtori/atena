import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { SystemStatus } from '@/pages/dashboard/system-status'

describe('SystemStatus', () => {
  it('renders system status card', () => {
    renderWithProviders(<SystemStatus />)
    expect(screen.getByText('Status do sistema')).toBeInTheDocument()
  })

  it('shows online status when health check passes', async () => {
    renderWithProviders(<SystemStatus />)
    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument()
    })
  })
})
