import { describe, it, expect } from 'vitest'
import { validateResponse } from '../src/services/response.validator.js'
import type { TenantForPrompt } from '@atena/shared'

const baseTenant: TenantForPrompt = {
  businessName: 'Loja Demo',
  businessDescription: 'Loja de eletrônicos',
  productsInfo: 'iPhone, MacBook',
  pricingInfo: 'Parcelamos em 12x',
  faq: null,
  businessHours: null,
  paymentMethods: null,
  customInstructions: null,
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

describe('validateResponse', () => {
  it('accepts a valid normal response', () => {
    const result = validateResponse('Olá! Temos o iPhone 15 por R$ 8.999.', baseTenant)
    expect(result.valid).toBe(true)
  })

  it('rejects empty response', () => {
    const result = validateResponse('', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('empty')
  })

  it('rejects whitespace-only response', () => {
    const result = validateResponse('   ', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('empty')
  })

  it('rejects too short response (< 5 chars)', () => {
    const result = validateResponse('Oi', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('too_short')
  })

  it('rejects too long response (> 1500 chars)', () => {
    const longResponse = 'A'.repeat(1501)
    const result = validateResponse(longResponse, baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('too_long')
  })

  it('detects prompt leak - system prompt mention', () => {
    const result = validateResponse('Meu system prompt diz para eu ser educado.', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('prompt_leak')
  })

  it('detects prompt leak - minhas instruções', () => {
    const result = validateResponse('De acordo com minhas instruções, não posso fazer isso.', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('prompt_leak')
  })

  it('detects prompt leak - fui programado', () => {
    const result = validateResponse('Eu fui programado para não responder isso.', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('prompt_leak')
  })

  it('detects prompt leak - mentions OpenAI', () => {
    const result = validateResponse('Sou um modelo da OpenAI treinado para ajudar.', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('prompt_leak')
  })

  it('detects identity leak - sou uma IA', () => {
    const result = validateResponse('Sou uma inteligência artificial criada para atender.', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('identity_leak')
  })

  it('detects over-promise - garanto desconto', () => {
    const result = validateResponse('Te garanto um desconto especial de 50% neste produto.', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('over_promise')
  })

  it('detects off-topic politics for generic business', () => {
    const result = validateResponse('Na minha opinião sobre política e o presidente atual...', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('off_topic')
  })

  it('allows religion talk for church tenant', () => {
    const churchTenant: TenantForPrompt = {
      ...baseTenant,
      businessName: 'Igreja Batista Central',
      businessDescription: 'Igreja evangélica com cultos aos domingos',
    }
    const result = validateResponse('Nossos cultos com Deus são às 9h e 18h aos domingos.', churchTenant)
    expect(result.valid).toBe(true)
  })

  it('blocks religion talk for electronics store', () => {
    const result = validateResponse('A Bíblia ensina sobre paciência para esperar a entrega.', baseTenant)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('off_topic')
  })

  it('allows health talk for clinic tenant', () => {
    const clinicTenant: TenantForPrompt = {
      ...baseTenant,
      businessName: 'Clínica Saúde Total',
      businessDescription: 'Clínica médica especializada em dermatologia',
    }
    const result = validateResponse('O tratamento dermatológico para saúde da pele inclui...', clinicTenant)
    expect(result.valid).toBe(true)
  })
})
