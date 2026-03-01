import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { BillingSection } from '@/pages/settings/billing-section'

const mockTenant = {
  id: 'test-id', name: 'Test', slug: 'test', plan: 'starter' as const,
  leadsLimit: 300, agentsLimit: 3, businessName: 'Negócio Teste',
  businessDescription: null, productsInfo: null, pricingInfo: null, faq: null,
  businessHours: null, paymentMethods: null, customInstructions: null,
  fallbackMessage: null, whatsappProvider: 'zapi' as const,
  whatsappConfig: {}, instagramConfig: {}, telegramBotConfig: {},
  handoffRules: { score_threshold: 60, max_ai_turns: 15, business_hours_only: false, handoff_intents: [], auto_handoff_on_price: false, follow_up_enabled: false, follow_up_delay_hours: 24 },
  quickReplies: [], billingStatus: 'trial' as const, trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}

describe('BillingSection', () => {
  it('renders plan badge', async () => {
    renderWithProviders(<BillingSection tenant={mockTenant} />)
    await waitFor(() => {
      expect(screen.getByText('Starter')).toBeInTheDocument()
    })
  })

  it('renders billing status', () => {
    renderWithProviders(<BillingSection tenant={mockTenant} />)
    expect(screen.getByText('Trial')).toBeInTheDocument()
  })

  it('renders leads usage', () => {
    renderWithProviders(<BillingSection tenant={mockTenant} />)
    expect(screen.getByText('Leads utilizados')).toBeInTheDocument()
  })
})
