import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { BusinessSection } from '@/pages/settings/business-section'

const mockTenant = {
  id: 'test-id',
  name: 'Test',
  slug: 'test',
  plan: 'starter' as const,
  leadsLimit: 300,
  agentsLimit: 3,
  businessName: 'Negócio Teste',
  businessDescription: 'Uma descrição do negócio',
  productsInfo: null,
  pricingInfo: null,
  faq: null,
  businessHours: '9h às 18h',
  paymentMethods: null,
  customInstructions: null,
  fallbackMessage: null,
  whatsappProvider: 'zapi' as const,
  whatsappConfig: {},
  instagramConfig: {},
  telegramBotConfig: {},
  handoffRules: {
    score_threshold: 60,
    max_ai_turns: 15,
    business_hours_only: false,
    handoff_intents: ['complaint'],
    auto_handoff_on_price: false,
    follow_up_enabled: false,
    follow_up_delay_hours: 24,
  },
  quickReplies: [],
  billingStatus: 'trial' as const,
  trialEndsAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('BusinessSection', () => {
  it('renders form fields with tenant data', () => {
    renderWithProviders(<BusinessSection tenant={mockTenant} />)
    expect(screen.getByDisplayValue('Negócio Teste')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Uma descrição do negócio')).toBeInTheDocument()
  })

  it('shows save button', () => {
    renderWithProviders(<BusinessSection tenant={mockTenant} />)
    expect(screen.getByText('Salvar')).toBeInTheDocument()
  })
})
