import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { ChannelsSection } from '@/pages/settings/channels-section'

const mockTenant = {
  id: 'test-id', name: 'Test', slug: 'test', plan: 'starter' as const,
  leadsLimit: 300, agentsLimit: 3, businessName: 'Negócio Teste',
  businessDescription: null, productsInfo: null, pricingInfo: null, faq: null,
  businessHours: null, paymentMethods: null, customInstructions: null,
  fallbackMessage: null, whatsappProvider: 'zapi' as const,
  whatsappConfig: {}, instagramConfig: {}, telegramBotConfig: {},
  handoffRules: { score_threshold: 60, max_ai_turns: 15, business_hours_only: false, handoff_intents: [], auto_handoff_on_price: false, follow_up_enabled: false, follow_up_delay_hours: 24 },
  quickReplies: [], billingStatus: 'trial' as const, trialEndsAt: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}

describe('ChannelsSection', () => {
  it('renders WhatsApp provider selector', () => {
    renderWithProviders(<ChannelsSection tenant={mockTenant} />)
    expect(screen.getByText('Salvar')).toBeInTheDocument()
  })
})
