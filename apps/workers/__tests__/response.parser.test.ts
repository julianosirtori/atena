import { describe, it, expect } from 'vitest'
import { parseAIResponse } from '../src/services/response.parser.js'

describe('parseAIResponse', () => {
  const validJson = JSON.stringify({
    response: 'Olá! Como posso ajudar?',
    intent: 'greeting',
    confidence: 95,
    should_handoff: false,
    handoff_reason: null,
    score_delta: 10,
    extracted_info: { name: 'Maria', interest: 'iPhone' },
  })

  it('parses valid JSON response correctly', () => {
    const result = parseAIResponse(validJson)
    expect(result.response).toBe('Olá! Como posso ajudar?')
    expect(result.intent).toBe('greeting')
    expect(result.confidence).toBe(95)
    expect(result.shouldHandoff).toBe(false)
    expect(result.handoffReason).toBeNull()
    expect(result.scoreDelta).toBe(10)
    expect(result.extractedInfo.name).toBe('Maria')
    expect(result.extractedInfo.interest).toBe('iPhone')
  })

  it('handles markdown code fences', () => {
    const wrapped = '```json\n' + validJson + '\n```'
    const result = parseAIResponse(wrapped)
    expect(result.response).toBe('Olá! Como posso ajudar?')
    expect(result.intent).toBe('greeting')
  })

  it('returns fallback for completely invalid input', () => {
    const result = parseAIResponse('not json at all')
    expect(result.shouldHandoff).toBe(true)
    expect(result.confidence).toBe(0)
    expect(result.handoffReason).toBe('AI response parse failure')
  })

  it('returns fallback for empty string', () => {
    const result = parseAIResponse('')
    expect(result.shouldHandoff).toBe(true)
    expect(result.confidence).toBe(0)
  })

  it('clamps confidence to 0-100 range', () => {
    const tooHigh = JSON.stringify({ ...JSON.parse(validJson), confidence: 150 })
    const tooLow = JSON.stringify({ ...JSON.parse(validJson), confidence: -20 })

    expect(parseAIResponse(tooHigh).confidence).toBe(100)
    expect(parseAIResponse(tooLow).confidence).toBe(0)
  })

  it('clamps score_delta to -50 to +30 range', () => {
    const tooHigh = JSON.stringify({ ...JSON.parse(validJson), score_delta: 100 })
    const tooLow = JSON.stringify({ ...JSON.parse(validJson), score_delta: -100 })

    expect(parseAIResponse(tooHigh).scoreDelta).toBe(30)
    expect(parseAIResponse(tooLow).scoreDelta).toBe(-50)
  })

  it('defaults unknown intent to other', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), intent: 'unknown_intent' })
    expect(parseAIResponse(json).intent).toBe('other')
  })

  it('coerces string should_handoff to boolean', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), should_handoff: 'true' })
    expect(parseAIResponse(json).shouldHandoff).toBe(true)
  })

  it('handles null handoff_reason as null', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), handoff_reason: 'null' })
    expect(parseAIResponse(json).handoffReason).toBeNull()
  })

  it('handles missing extracted_info gracefully', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), extracted_info: undefined })
    const result = parseAIResponse(json)
    expect(result.extractedInfo).toEqual({})
  })

  it('uses fallback response when response field is empty', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), response: '' })
    const result = parseAIResponse(json)
    expect(result.response).toContain('Desculpe')
  })

  it('never throws an exception', () => {
    const inputs = [null, undefined, '', '{}', 'true', '123', '[]', '{invalid']
    for (const input of inputs) {
      expect(() => parseAIResponse(input as string)).not.toThrow()
    }
  })

  it('rounds confidence and score_delta to integers', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), confidence: 85.7, score_delta: 12.3 })
    const result = parseAIResponse(json)
    expect(result.confidence).toBe(86)
    expect(result.scoreDelta).toBe(12)
  })
})
