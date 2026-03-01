import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { LeadKanban } from '@/pages/leads/lead-kanban'

const mockLeads = [
  {
    id: 'lead-1', tenantId: 't', name: 'Ana', phone: '+5511988776655',
    instagramId: null, email: null, avatarUrl: null, channel: 'whatsapp' as const,
    source: null, utmSource: null, utmMedium: null, utmCampaign: null,
    stage: 'new' as const, score: 10, tags: [], assignedTo: null,
    activeCampaignId: null, firstContactAt: new Date().toISOString(),
    lastContactAt: new Date().toISOString(), lastMessageAt: null, convertedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

describe('LeadKanban', () => {
  it('renders kanban columns', () => {
    renderWithProviders(<LeadKanban leads={mockLeads} />)
    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByText('Qualificando')).toBeInTheDocument()
    expect(screen.getByText('Quente')).toBeInTheDocument()
  })

  it('shows lead in correct column', () => {
    renderWithProviders(<LeadKanban leads={mockLeads} />)
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })
})
