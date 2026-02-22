import type { ParsedAIResponse } from '@atena/shared'

const VALID_INTENTS = ['greeting', 'question', 'buying', 'complaint', 'farewell', 'spam', 'other'] as const

const FALLBACK_RESPONSE: ParsedAIResponse = {
  response: 'Desculpe, estou com dificuldades no momento. Vou te conectar com um de nossos consultores.',
  intent: 'other',
  confidence: 0,
  shouldHandoff: true,
  handoffReason: 'AI response parse failure',
  scoreDelta: 0,
  extractedInfo: {},
}

export function parseAIResponse(rawText: string): ParsedAIResponse {
  try {
    // Remove markdown code fences if present
    let cleaned = rawText.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    cleaned = cleaned.trim()

    const parsed = JSON.parse(cleaned)

    // Validate and coerce response field
    const response = typeof parsed.response === 'string' && parsed.response.trim().length > 0
      ? parsed.response.trim()
      : FALLBACK_RESPONSE.response

    // Validate intent
    const rawIntent = typeof parsed.intent === 'string' ? parsed.intent.toLowerCase() : 'other'
    const intent = VALID_INTENTS.includes(rawIntent as typeof VALID_INTENTS[number])
      ? (rawIntent as ParsedAIResponse['intent'])
      : 'other'

    // Coerce confidence (0-100)
    const rawConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0
    const confidence = Math.max(0, Math.min(100, Math.round(rawConfidence)))

    // Coerce shouldHandoff
    const shouldHandoff = typeof parsed.should_handoff === 'boolean'
      ? parsed.should_handoff
      : Boolean(parsed.should_handoff)

    // Coerce handoffReason
    const handoffReason = typeof parsed.handoff_reason === 'string' && parsed.handoff_reason !== 'null'
      ? parsed.handoff_reason
      : null

    // Coerce scoreDelta (-50 to +30)
    const rawDelta = typeof parsed.score_delta === 'number' ? parsed.score_delta : 0
    const scoreDelta = Math.max(-50, Math.min(30, Math.round(rawDelta)))

    // Extract info
    const rawInfo = typeof parsed.extracted_info === 'object' && parsed.extracted_info !== null
      ? parsed.extracted_info
      : {}
    const extractedInfo: ParsedAIResponse['extractedInfo'] = {}
    if (typeof rawInfo.name === 'string' && rawInfo.name.trim()) {
      extractedInfo.name = rawInfo.name.trim()
    }
    if (typeof rawInfo.email === 'string' && rawInfo.email.trim()) {
      extractedInfo.email = rawInfo.email.trim()
    }
    if (typeof rawInfo.interest === 'string' && rawInfo.interest.trim()) {
      extractedInfo.interest = rawInfo.interest.trim()
    }

    return {
      response,
      intent,
      confidence,
      shouldHandoff,
      handoffReason,
      scoreDelta,
      extractedInfo,
    }
  } catch {
    // NEVER throw — return fallback
    return { ...FALLBACK_RESPONSE }
  }
}
