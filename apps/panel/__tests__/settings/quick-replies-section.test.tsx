import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import { QuickRepliesSection } from '@/pages/settings/quick-replies-section'

const mockTenant = {
  id: 'test-id', name: 'Test', slug: 'test', plan: 'starter' as const,
  leadsLimit: 300, agentsLimit: 3, businessName: 'Negócio Teste',
  businessDescription: null, productsInfo: null, pricingInfo: null, faq: null,
  businessHours: null, paymentMethods: null, customInstructions: null,
  fallbackMessage: null, whatsappProvider: 'zapi' as const,
  whatsappConfig: {}, instagramConfig: {}, telegramBotConfig: {},
  handoffRules: { score_threshold: 60, max_ai_turns: 15, business_hours_only: false, handoff_intents: [], auto_handoff_on_price: false, follow_up_enabled: false, follow_up_delay_hours: 24 },
  quickReplies: [
    { id: 'qr-1', label: 'Horário', text: 'Nosso horário é de 9h às 18h.' },
    { id: 'qr-2', label: 'Preço', text: 'Consulte nossa tabela de preços.' },
  ],
  billingStatus: 'trial' as const, trialEndsAt: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}

describe('QuickRepliesSection', () => {
  it('renders quick replies list', () => {
    renderWithProviders(<QuickRepliesSection tenant={mockTenant} />)
    expect(screen.getByText('Horário')).toBeInTheDocument()
    expect(screen.getByText('Preço')).toBeInTheDocument()
  })

  it('shows count header', () => {
    renderWithProviders(<QuickRepliesSection tenant={mockTenant} />)
    expect(screen.getByText('Respostas rápidas (2/20)')).toBeInTheDocument()
  })

  it('opens create modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickRepliesSection tenant={mockTenant} />)
    await user.click(screen.getByText('Nova resposta'))
    expect(screen.getByText('Nova resposta rápida')).toBeInTheDocument()
  })

  it('shows empty state when no replies', () => {
    renderWithProviders(
      <QuickRepliesSection tenant={{ ...mockTenant, quickReplies: [] }} />,
    )
    expect(screen.getByText('Nenhuma resposta rápida cadastrada.')).toBeInTheDocument()
  })
})
