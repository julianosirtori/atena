import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { ActivityFeed } from '@/pages/dashboard/activity-feed'

describe('ActivityFeed', () => {
  it('renders activity header', async () => {
    renderWithProviders(<ActivityFeed />)
    expect(screen.getByText('Atividade recente')).toBeInTheDocument()
  })

  it('shows empty state when no events', async () => {
    renderWithProviders(<ActivityFeed />)
    await waitFor(() => {
      expect(screen.getByText('Nenhuma atividade recente.')).toBeInTheDocument()
    })
  })
})
