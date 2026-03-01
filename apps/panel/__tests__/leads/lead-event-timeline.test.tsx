import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { LeadEventTimeline } from '@/pages/leads/lead-event-timeline'

describe('LeadEventTimeline', () => {
  it('renders empty state when no events', async () => {
    renderWithProviders(<LeadEventTimeline leadId="test-lead-id" />)
    await waitFor(() => {
      expect(screen.getByText('Nenhum evento registrado.')).toBeInTheDocument()
    })
  })
})
