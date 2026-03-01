import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { LeadTable } from '@/pages/leads/lead-table'

const mockLeads = [
  {
    id: 'lead-1', tenantId: 't', name: 'João', phone: '+5511999887766',
    instagramId: null, email: null, avatarUrl: null, channel: 'whatsapp' as const,
    source: null, utmSource: null, utmMedium: null, utmCampaign: null,
    stage: 'qualifying' as const, score: 42, tags: ['vip'], assignedTo: null,
    activeCampaignId: null, firstContactAt: new Date().toISOString(),
    lastContactAt: new Date().toISOString(), lastMessageAt: null, convertedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

describe('LeadTable', () => {
  it('renders lead rows', () => {
    renderWithProviders(
      <LeadTable leads={mockLeads} page={1} totalPages={1} onPageChange={() => {}} />,
    )
    // Lead name appears in both mobile card and desktop table views
    const names = screen.getAllByText('João')
    expect(names.length).toBeGreaterThanOrEqual(1)
    // Score appears in both views too
    expect(screen.getAllByText(/42/).length).toBeGreaterThanOrEqual(1)
  })
})
