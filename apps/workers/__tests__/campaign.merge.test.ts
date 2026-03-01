import { describe, it, expect } from 'vitest'
import { mergeCampaignConfig } from '../src/services/campaign.merge.js'
import type { TenantForPrompt, CampaignForPrompt } from '@atena/shared'

const baseTenant: TenantForPrompt = {
  businessName: 'Milena Aranha Fisioterapia',
  businessDescription: 'Fisioterapia especializada',
  productsInfo: 'Sessão de fisioterapia, Cursos',
  pricingInfo: 'Valores sob consulta',
  faq: 'O tratamento dói? Não!',
  businessHours: 'Seg-Sex 8h-18h',
  paymentMethods: 'PIX, cartão',
  customInstructions: 'Responda de forma acolhedora. Nunca prometa cura.',
  fallbackMessage: 'Vou pedir para a Milena te responder.',
  handoffRules: {
    score_threshold: 60,
    max_ai_turns: 15,
    business_hours_only: false,
    handoff_intents: ['complaint'],
    auto_handoff_on_price: false,
    follow_up_enabled: false,
    follow_up_delay_hours: 24,
  },
}

const baseCampaign: CampaignForPrompt = {
  name: 'Lançamento Curso Dor Crônica',
  description: 'Campanha de lançamento do curso',
  productsInfo: 'Curso Online: Manejo da Dor Crônica — 40h',
  pricingInfo: 'R$ 997 à vista ou 12x R$ 97',
  faq: 'O curso é 100% online? Sim!',
  customInstructions: 'Foque no diferencial do curso. Reforce urgência do early bird.',
  fallbackMessage: 'A Milena vai te responder sobre o curso em breve!',
  handoffRules: {
    max_ai_turns: 20,
    auto_handoff_on_price: true,
  },
}

describe('mergeCampaignConfig', () => {
  it('returns tenant unchanged when campaign is null', () => {
    const result = mergeCampaignConfig(baseTenant, null)
    expect(result).toEqual(baseTenant)
  })

  it('does not mutate the original tenant object', () => {
    const original = { ...baseTenant }
    mergeCampaignConfig(baseTenant, baseCampaign)
    expect(baseTenant).toEqual(original)
  })

  // REPLACE strategy tests
  it('replaces productsInfo when campaign has non-null value', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.productsInfo).toBe('Curso Online: Manejo da Dor Crônica — 40h')
  })

  it('replaces pricingInfo when campaign has non-null value', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.pricingInfo).toBe('R$ 997 à vista ou 12x R$ 97')
  })

  it('replaces faq when campaign has non-null value', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.faq).toBe('O curso é 100% online? Sim!')
  })

  it('replaces fallbackMessage when campaign has non-null value', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.fallbackMessage).toBe('A Milena vai te responder sobre o curso em breve!')
  })

  it('keeps tenant productsInfo when campaign has null value', () => {
    const campaign: CampaignForPrompt = { ...baseCampaign, productsInfo: null }
    const result = mergeCampaignConfig(baseTenant, campaign)
    expect(result.productsInfo).toBe('Sessão de fisioterapia, Cursos')
  })

  it('keeps tenant pricingInfo when campaign has null value', () => {
    const campaign: CampaignForPrompt = { ...baseCampaign, pricingInfo: null }
    const result = mergeCampaignConfig(baseTenant, campaign)
    expect(result.pricingInfo).toBe('Valores sob consulta')
  })

  // APPEND strategy test
  it('appends campaign customInstructions to tenant instructions', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.customInstructions).toContain('Responda de forma acolhedora. Nunca prometa cura.')
    expect(result.customInstructions).toContain('Foque no diferencial do curso.')
    expect(result.customInstructions).toContain('Lançamento Curso Dor Crônica')
  })

  it('uses campaign customInstructions directly when tenant has none', () => {
    const tenant: TenantForPrompt = { ...baseTenant, customInstructions: null }
    const result = mergeCampaignConfig(tenant, baseCampaign)
    expect(result.customInstructions).toBe(
      'Foque no diferencial do curso. Reforce urgência do early bird.',
    )
  })

  it('keeps tenant customInstructions when campaign has none', () => {
    const campaign: CampaignForPrompt = { ...baseCampaign, customInstructions: null }
    const result = mergeCampaignConfig(baseTenant, campaign)
    expect(result.customInstructions).toBe('Responda de forma acolhedora. Nunca prometa cura.')
  })

  // SHALLOW MERGE strategy tests
  it('shallow-merges handoffRules — campaign overrides specific fields', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.handoffRules.max_ai_turns).toBe(20) // from campaign
    expect(result.handoffRules.auto_handoff_on_price).toBe(true) // from campaign
    expect(result.handoffRules.score_threshold).toBe(60) // kept from tenant
    expect(result.handoffRules.handoff_intents).toEqual(['complaint']) // kept from tenant
    expect(result.handoffRules.business_hours_only).toBe(false) // kept from tenant
  })

  it('keeps original handoffRules when campaign has null', () => {
    const campaign: CampaignForPrompt = { ...baseCampaign, handoffRules: null }
    const result = mergeCampaignConfig(baseTenant, campaign)
    expect(result.handoffRules).toEqual(baseTenant.handoffRules)
  })

  // Fields NOT affected by campaign
  it('preserves businessName from tenant', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.businessName).toBe('Milena Aranha Fisioterapia')
  })

  it('preserves businessDescription from tenant', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.businessDescription).toBe('Fisioterapia especializada')
  })

  it('preserves businessHours from tenant', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.businessHours).toBe('Seg-Sex 8h-18h')
  })

  it('preserves paymentMethods from tenant', () => {
    const result = mergeCampaignConfig(baseTenant, baseCampaign)
    expect(result.paymentMethods).toBe('PIX, cartão')
  })

  // Edge cases
  it('handles campaign with all null overrides gracefully', () => {
    const emptyCampaign: CampaignForPrompt = {
      name: 'Empty Campaign',
      description: null,
      productsInfo: null,
      pricingInfo: null,
      faq: null,
      customInstructions: null,
      fallbackMessage: null,
      handoffRules: null,
    }
    const result = mergeCampaignConfig(baseTenant, emptyCampaign)
    expect(result.productsInfo).toBe(baseTenant.productsInfo)
    expect(result.pricingInfo).toBe(baseTenant.pricingInfo)
    expect(result.faq).toBe(baseTenant.faq)
    expect(result.customInstructions).toBe(baseTenant.customInstructions)
    expect(result.fallbackMessage).toBe(baseTenant.fallbackMessage)
    expect(result.handoffRules).toEqual(baseTenant.handoffRules)
  })

  it('handles tenant with all null fields and campaign overrides', () => {
    const emptyTenant: TenantForPrompt = {
      ...baseTenant,
      productsInfo: null,
      pricingInfo: null,
      faq: null,
      customInstructions: null,
      fallbackMessage: null,
    }
    const result = mergeCampaignConfig(emptyTenant, baseCampaign)
    expect(result.productsInfo).toBe(baseCampaign.productsInfo)
    expect(result.pricingInfo).toBe(baseCampaign.pricingInfo)
    expect(result.faq).toBe(baseCampaign.faq)
  })
})
