import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()

// Mock @langchain/openai before importing
vi.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: class MockChatOpenAI {
      invoke = mockInvoke
      constructor() {}
    },
  }
})

// Mock @atena/config
vi.mock('@atena/config', () => ({
  env: {
    AI_MODEL: 'gpt-4o',
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'test-key',
    CLAUDE_API_KEY: undefined,
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
  },
}))

// Mock logger
vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    })),
  },
}))

import { createAIService } from '../src/services/ai.service.js'

describe('createAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an AI service with call method', () => {
    const service = createAIService()
    expect(service).toHaveProperty('call')
    expect(typeof service.call).toBe('function')
  })

  it('returns rawText, tokensUsed, and responseTimeMs', async () => {
    mockInvoke.mockResolvedValue({
      content: '{"response": "Olá!"}',
      usage_metadata: { total_tokens: 150 },
    })

    const service = createAIService()
    const result = await service.call('system prompt', 'user prompt')

    expect(result.rawText).toBe('{"response": "Olá!"}')
    expect(result.tokensUsed).toBe(150)
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('handles missing usage_metadata gracefully', async () => {
    mockInvoke.mockResolvedValue({
      content: '{"response": "Olá!"}',
    })

    const service = createAIService()
    const result = await service.call('system prompt', 'user prompt')

    expect(result.tokensUsed).toBe(0)
  })

  it('passes system and user messages to model', async () => {
    mockInvoke.mockResolvedValue({
      content: '{}',
      usage_metadata: { total_tokens: 50 },
    })

    const service = createAIService()
    await service.call('my system prompt', 'my user prompt')

    expect(mockInvoke).toHaveBeenCalledOnce()
    const msgs = mockInvoke.mock.calls[0][0]
    expect(msgs).toHaveLength(2)
    expect(msgs[0].content).toBe('my system prompt')
    expect(msgs[1].content).toBe('my user prompt')
  })

  it('propagates errors from model.invoke', async () => {
    const authError = new Error('Unauthorized')
    ;(authError as any).status = 401
    mockInvoke.mockRejectedValue(authError)

    const service = createAIService()
    await expect(service.call('system', 'user')).rejects.toThrow('Unauthorized')
  })

  it('converts non-string content to JSON string', async () => {
    mockInvoke.mockResolvedValue({
      content: [{ type: 'text', text: 'hello' }],
      usage_metadata: { total_tokens: 30 },
    })

    const service = createAIService()
    const result = await service.call('system', 'user')

    expect(typeof result.rawText).toBe('string')
  })
})
