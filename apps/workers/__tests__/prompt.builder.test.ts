import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildUserPrompt } from '../src/services/prompt.builder.js'
import type { TenantForPrompt, LeadForPrompt, MessageForPrompt } from '@atena/shared'

const baseTenant: TenantForPrompt = {
  businessName: 'Loja Demo',
  businessDescription: 'Loja de eletrônicos',
  productsInfo: 'iPhone, MacBook',
  pricingInfo: 'Parcelamos em 12x',
  faq: 'Prazo de entrega: 1-3 dias úteis.',
  businessHours: 'Seg-Sex 9h-18h',
  paymentMethods: 'PIX, cartão',
  customInstructions: 'Sempre oferecer frete grátis acima de R$299.',
  fallbackMessage: null,
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

const baseLead: LeadForPrompt = {
  name: 'Maria',
  phone: '5511999001001',
  score: 40,
  stage: 'qualifying',
  channel: 'whatsapp',
  tags: ['interessada', 'iphone'],
}

describe('buildSystemPrompt', () => {
  it('includes business name in role section', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).toContain('<role>')
    expect(prompt).toContain('Loja Demo')
  })

  it('includes business info section with all fields', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).toContain('<business_info>')
    expect(prompt).toContain('Loja de eletrônicos')
    expect(prompt).toContain('iPhone, MacBook')
    expect(prompt).toContain('Parcelamos em 12x')
    expect(prompt).toContain('PIX, cartão')
    expect(prompt).toContain('Seg-Sex 9h-18h')
  })

  it('includes FAQ section when faq is present', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).toContain('<faq>')
    expect(prompt).toContain('Prazo de entrega: 1-3 dias úteis.')
  })

  it('omits FAQ section when faq is null', () => {
    const tenant = { ...baseTenant, faq: null }
    const prompt = buildSystemPrompt(tenant)
    expect(prompt).not.toContain('<faq>')
  })

  it('includes rules section with business name', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).toContain('<rules>')
    expect(prompt).toContain('assistente da Loja Demo')
  })

  it('includes custom instructions when present', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).toContain('<custom_instructions>')
    expect(prompt).toContain('frete grátis acima de R$299')
  })

  it('omits custom instructions when null', () => {
    const tenant = { ...baseTenant, customInstructions: null }
    const prompt = buildSystemPrompt(tenant)
    expect(prompt).not.toContain('<custom_instructions>')
  })

  it('includes response format section', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).toContain('<response_format>')
    expect(prompt).toContain('"response"')
    expect(prompt).toContain('"intent"')
  })

  it('includes handoff criteria with max_ai_turns', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).toContain('<handoff_criteria>')
    expect(prompt).toContain('15 turnos')
  })

  it('includes price handoff criterion when auto_handoff_on_price is true', () => {
    const tenant = {
      ...baseTenant,
      handoffRules: { ...baseTenant.handoffRules, auto_handoff_on_price: true },
    }
    const prompt = buildSystemPrompt(tenant)
    expect(prompt).toContain('preço final')
  })

  it('omits price handoff criterion when auto_handoff_on_price is false', () => {
    const prompt = buildSystemPrompt(baseTenant)
    expect(prompt).not.toContain('preço final')
  })

  it('uses defaults for null business fields', () => {
    const tenant: TenantForPrompt = {
      ...baseTenant,
      businessDescription: null,
      productsInfo: null,
      pricingInfo: null,
      businessHours: null,
      paymentMethods: null,
    }
    const prompt = buildSystemPrompt(tenant)
    expect(prompt).toContain('Não informada')
    expect(prompt).toContain('Não informado')
  })
})

describe('buildUserPrompt', () => {
  it('includes lead context with all fields', () => {
    const prompt = buildUserPrompt(baseLead, [], 'Oi')
    expect(prompt).toContain('<lead_context>')
    expect(prompt).toContain('Nome: Maria')
    expect(prompt).toContain('Score atual: 40')
    expect(prompt).toContain('Estágio: qualifying')
    expect(prompt).toContain('Canal: whatsapp')
    expect(prompt).toContain('Tags: interessada, iphone')
  })

  it('uses Desconhecido when lead name is null', () => {
    const lead = { ...baseLead, name: null }
    const prompt = buildUserPrompt(lead, [], 'Oi')
    expect(prompt).toContain('Nome: Desconhecido')
  })

  it('includes conversation history', () => {
    const msgs: MessageForPrompt[] = [
      { senderType: 'lead', content: 'Oi', createdAt: new Date() },
      { senderType: 'ai', content: 'Olá!', createdAt: new Date() },
    ]
    const prompt = buildUserPrompt(baseLead, msgs, 'Quanto custa?')
    expect(prompt).toContain('<conversation_history>')
    expect(prompt).toContain('[lead]: Oi')
    expect(prompt).toContain('[assistente]: Olá!')
  })

  it('limits history to last 10 messages', () => {
    const msgs: MessageForPrompt[] = Array.from({ length: 15 }, (_, i) => ({
      senderType: i % 2 === 0 ? ('lead' as const) : ('ai' as const),
      content: `Message ${i}`,
      createdAt: new Date(),
    }))
    const prompt = buildUserPrompt(baseLead, msgs, 'New message')
    expect(prompt).not.toContain('Message 0')
    expect(prompt).not.toContain('Message 4')
    expect(prompt).toContain('Message 5')
    expect(prompt).toContain('Message 14')
  })

  it('omits conversation history section when no messages', () => {
    const prompt = buildUserPrompt(baseLead, [], 'Oi')
    expect(prompt).not.toContain('<conversation_history>')
  })

  it('includes current message', () => {
    const prompt = buildUserPrompt(baseLead, [], 'Quanto custa o iPhone?')
    expect(prompt).toContain('<current_message>')
    expect(prompt).toContain('Quanto custa o iPhone?')
  })

  it('shows nenhuma when tags is null', () => {
    const lead = { ...baseLead, tags: null }
    const prompt = buildUserPrompt(lead, [], 'Oi')
    expect(prompt).toContain('Tags: nenhuma')
  })
})
