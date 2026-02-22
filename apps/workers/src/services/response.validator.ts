import type { ValidationResult, TenantForPrompt } from '@atena/shared'

const LEAK_PATTERNS: RegExp[] = [
  /system\s*prompt/i,
  /minhas?\s*instruções/i,
  /fui\s*programad/i,
  /meu\s*(?:prompt|treinamento)/i,
  /regras?\s*(?:que\s*)?(?:me\s*)?(?:foram|deram)/i,
  /large\s*language\s*model/i,
  /anthropic|openai|gpt-?\d/i,
]

const BLOCKED_IDENTITY: RegExp[] = [
  /sou\s*(?:um|uma)\s*(?:ia|inteligência artificial)/i,
  /modelo\s*de\s*linguagem/i,
  /(?:treinado|criado)\s*(?:pela?|por)/i,
]

const OVER_PROMISE_PATTERNS: RegExp[] = [
  /(?:te dou|vou dar|posso dar|te garanto).*(?:desconto|grátis)/i,
  /(?:garanto|prometo|certeza absoluta)/i,
  /(?:sem risco|100%|garantido)/i,
]

const OFF_TOPIC_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /(?:polític|governo|eleição|presidente|senador|deputado)/i, category: 'politics' },
  { pattern: /(?:igrej|bíblia|deus|religios|pastor|culto)/i, category: 'religion' },
  { pattern: /(?:clínic|médic|saúde|diagnóstico|tratamento|remédio)/i, category: 'health' },
]

interface BusinessContextFlags {
  allowPolitics: boolean
  allowReligion: boolean
  allowHealth: boolean
}

function analyzeBusinessContext(tenant: TenantForPrompt): BusinessContextFlags {
  const context = [
    tenant.businessDescription || '',
    tenant.productsInfo || '',
    tenant.businessName || '',
  ].join(' ').toLowerCase()

  return {
    allowPolitics: /polític|governo/.test(context),
    allowReligion: /igrej|bíblia|religios/.test(context),
    allowHealth: /clínic|médic|saúde/.test(context),
  }
}

export function validateResponse(response: string, tenant: TenantForPrompt): ValidationResult {
  // Empty check
  if (!response || response.trim().length === 0) {
    return { valid: false, reason: 'empty', severity: 'medium' }
  }

  // Too short
  if (response.trim().length < 5) {
    return { valid: false, reason: 'too_short', severity: 'low' }
  }

  // Too long (> 1500 chars)
  if (response.length > 1500) {
    return { valid: false, reason: 'too_long', severity: 'low' }
  }

  // Prompt leak detection
  for (const pattern of LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return { valid: false, reason: 'prompt_leak', severity: 'high' }
    }
  }

  // Identity leak detection
  for (const pattern of BLOCKED_IDENTITY) {
    if (pattern.test(response)) {
      return { valid: false, reason: 'identity_leak', severity: 'high' }
    }
  }

  // Over-promise detection
  for (const pattern of OVER_PROMISE_PATTERNS) {
    if (pattern.test(response)) {
      return { valid: false, reason: 'over_promise', severity: 'medium' }
    }
  }

  // Context-aware off-topic detection
  const contextFlags = analyzeBusinessContext(tenant)

  for (const { pattern, category } of OFF_TOPIC_PATTERNS) {
    if (pattern.test(response)) {
      if (category === 'politics' && !contextFlags.allowPolitics) {
        return { valid: false, reason: 'off_topic', severity: 'low' }
      }
      if (category === 'religion' && !contextFlags.allowReligion) {
        return { valid: false, reason: 'off_topic', severity: 'low' }
      }
      if (category === 'health' && !contextFlags.allowHealth) {
        return { valid: false, reason: 'off_topic', severity: 'low' }
      }
    }
  }

  return { valid: true }
}
