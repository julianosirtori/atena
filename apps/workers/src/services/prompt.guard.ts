import type { SanitizationResult } from '@atena/shared'

const INJECTION_PATTERNS: { pattern: RegExp; flag: string }[] = [
  { pattern: /ignore.*(?:previous|above|prior|acima|anterior)/i, flag: 'ignore_previous' },
  { pattern: /(?:new|novo)\s*(?:prompt|instruction|instrução)/i, flag: 'new_prompt' },
  { pattern: /(?:forget|esqueça).*(?:rules|regras|instructions)/i, flag: 'forget_rules' },
  { pattern: /(?:pretend|finja|act as|atue como)/i, flag: 'role_change' },
  { pattern: /(?:system\s*prompt|configuração|configuration)/i, flag: 'system_access' },
  { pattern: /(?:you are now|agora você é)/i, flag: 'identity_override' },
  { pattern: /(?:repeat|repita).*(?:instructions|instruções|prompt)/i, flag: 'prompt_extraction' },
  { pattern: /<\/?(?:system|prompt|instruction)/i, flag: 'xml_injection' },
  { pattern: /(?:DAN|jailbreak|bypass)/i, flag: 'jailbreak' },
  { pattern: /(?:ignore|desconsidere)\s+(?:tudo|everything|all)/i, flag: 'ignore_all' },
  { pattern: /(?:override|sobrescreva|substitua)\s+(?:(?:as|the|all|todas?)\s+)?(?:rules|regras)/i, flag: 'override_rules' },
]

const HANDOFF_KEYWORDS: RegExp[] = [
  /falar com\s*(?:alguém|humano|pessoa|atendente|gente)/i,
  /(?:quero|preciso|pode)\s*(?:falar|conversar)\s*com/i,
  /(?:chama|chamar)\s*(?:alguém|gerente|responsável|atendente)/i,
  /(?:atendente|humano|pessoa real|gerente|responsável)/i,
]

const MAX_MESSAGE_LENGTH = 2000

export function sanitizeInput(message: string): SanitizationResult {
  const flags: string[] = []

  // Detect injection patterns
  for (const { pattern, flag } of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      flags.push(flag)
    }
  }

  // Detect explicit handoff requests
  for (const pattern of HANDOFF_KEYWORDS) {
    if (pattern.test(message)) {
      flags.push('explicit_handoff')
      break
    }
  }

  // Clean the message
  let cleanMessage = message

  // Remove XML/HTML tags
  cleanMessage = cleanMessage.replace(/<[^>]*>/g, '')

  // Truncate to max length
  if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
    cleanMessage = cleanMessage.slice(0, MAX_MESSAGE_LENGTH)
    flags.push('truncated')
  }

  return {
    cleanMessage: cleanMessage.trim(),
    flags,
    isClean: flags.length === 0,
  }
}
