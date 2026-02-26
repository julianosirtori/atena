import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreakerOpenError } from '@atena/shared'

// Mock @atena/config
vi.mock('@atena/config', () => ({
  env: {
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
    REDIS_URL: 'redis://localhost:6379',
    AI_MODEL: 'gpt-4o',
    AI_PROVIDER: 'openai',
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

// Track calls via hoisted mocks
const { mockInsertValues, mockTriggerHandoff, mockLogAIFailureIncident, selectResults } = vi.hoisted(() => {
  return {
    mockInsertValues: vi.fn(),
    mockTriggerHandoff: vi.fn().mockResolvedValue(undefined),
    mockLogAIFailureIncident: vi.fn().mockResolvedValue(undefined),
    selectResults: { data: [] as unknown[][] },
  }
})

// Track call index for sequential select queries
let selectCallIndex = 0

vi.mock('@atena/database', () => {
  const mockLimit = vi.fn(() => {
    const result = selectResults.data[selectCallIndex] || []
    selectCallIndex++
    return result
  })

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: mockLimit,
            orderBy: vi.fn(() => ({
              limit: mockLimit,
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: mockInsertValues.mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'new-msg-id' }]),
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    },
    tenants: {},
    leads: {},
    conversations: {},
    messages: {},
    securityIncidents: {},
  }
})

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}))

vi.mock('@atena/channels', () => ({
  MockAdapter: class {
    sendMessage = vi.fn().mockResolvedValue(undefined)
  },
  ZApiAdapter: class {
    sendMessage = vi.fn().mockResolvedValue(undefined)
  },
  MetaWhatsAppAdapter: class {
    sendMessage = vi.fn().mockResolvedValue(undefined)
  },
}))

vi.mock('../src/services/prompt.guard.js', () => ({
  sanitizeInput: vi.fn(() => ({ cleanMessage: 'test', flags: [], isClean: true })),
}))

vi.mock('../src/services/prompt.builder.js', () => ({
  buildSystemPrompt: vi.fn(() => 'system'),
  buildUserPrompt: vi.fn(() => 'user'),
}))

vi.mock('../src/services/response.parser.js', () => ({
  parseAIResponse: vi.fn(() => ({
    response: 'AI response',
    intent: 'greeting',
    confidence: 90,
    shouldHandoff: false,
    handoffReason: null,
    scoreDelta: 10,
    extractedInfo: {},
  })),
}))

vi.mock('../src/services/response.validator.js', () => ({
  validateResponse: vi.fn(() => ({ valid: true })),
}))

vi.mock('../src/services/scoring.service.js', () => ({
  updateScore: vi.fn(() => ({ newScore: 30, stageChanged: false })),
  shouldAutoHandoff: vi.fn(() => false),
}))

vi.mock('../src/services/handoff.service.js', () => ({
  triggerHandoff: mockTriggerHandoff,
}))

vi.mock('../src/services/security-incident.service.js', () => ({
  logAIFailureIncident: mockLogAIFailureIncident,
  logSanitizationIncident: vi.fn().mockResolvedValue(undefined),
  logValidationIncident: vi.fn().mockResolvedValue(undefined),
}))

import { processMessage, type ProcessMessageJob } from '../src/services/message.pipeline.js'

const GENERIC_FALLBACK_MSG =
  'Desculpe, estou com dificuldades no momento. Vou te conectar com um de nossos consultores.'

const baseTenant = {
  id: 'tenant-1',
  name: 'Test Tenant',
  slug: 'test',
  plan: 'starter',
  leadsLimit: 300,
  agentsLimit: 1,
  businessName: 'Test Business',
  businessDescription: null,
  productsInfo: null,
  pricingInfo: null,
  faq: null,
  businessHours: null,
  paymentMethods: null,
  customInstructions: null,
  fallbackMessage: null,
  whatsappProvider: 'zapi',
  whatsappConfig: { instanceId: 'mock' },
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
  stripeCustomerId: null,
  billingStatus: 'trial',
  trialEndsAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseLead = {
  id: 'lead-1',
  tenantId: 'tenant-1',
  name: 'Test Lead',
  phone: '5511999990000',
  instagramId: null,
  email: null,
  avatarUrl: null,
  channel: 'whatsapp',
  source: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  stage: 'new',
  score: 0,
  tags: [],
  assignedTo: null,
  lastCountedMonth: null,
  metadata: {},
  firstContactAt: new Date(),
  lastContactAt: new Date(),
  lastMessageAt: new Date(),
  convertedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseConversation = {
  id: 'conv-1',
  tenantId: 'tenant-1',
  leadId: 'lead-1',
  channel: 'whatsapp',
  status: 'ai',
  assignedAgentId: null,
  aiMessagesCount: 0,
  humanMessagesCount: 0,
  leadMessagesCount: 0,
  firstResponseTimeMs: null,
  aiModel: 'gpt-4o',
  aiSummary: null,
  handoffReason: null,
  handoffAt: null,
  openedAt: new Date(),
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseMessage = {
  id: 'msg-1',
  tenantId: 'tenant-1',
  conversationId: 'conv-1',
  direction: 'inbound',
  senderType: 'lead',
  senderAgentId: null,
  content: 'Oi, tudo bem?',
  contentType: 'text',
  mediaUrl: null,
  aiMetadata: {},
  deliveryStatus: 'delivered',
  externalId: null,
  injectionFlags: [],
  validationResult: 'valid',
  correlationId: null,
  createdAt: new Date(),
}

const baseJob: ProcessMessageJob = {
  tenantId: 'tenant-1',
  leadId: 'lead-1',
  conversationId: 'conv-1',
  messageId: 'msg-1',
  correlationId: 'corr-123',
}

function setupDbReturns(tenant = baseTenant, lead = baseLead, conversation = baseConversation, message = baseMessage) {
  selectCallIndex = 0
  selectResults.data = [
    [tenant],       // 1: tenant
    [lead],         // 2: lead
    [conversation], // 3: conversation
    [message],      // 4: inbound message
    [],             // 5: conversation history
  ]
}

describe('processMessage - AI fallback resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTriggerHandoff.mockResolvedValue(undefined)
    mockLogAIFailureIncident.mockResolvedValue(undefined)
  })

  it('uses tenant.fallbackMessage when AI fails and tenant has custom fallback', async () => {
    const tenant = { ...baseTenant, fallbackMessage: 'Mensagem personalizada de fallback' }
    setupDbReturns(tenant)

    const aiService = {
      call: vi.fn().mockRejectedValue(new Error('AI timeout')),
    }

    await processMessage(baseJob, aiService)

    const insertCall = mockInsertValues.mock.calls.find(
      (call: any[]) => call[0]?.content === 'Mensagem personalizada de fallback',
    )
    expect(insertCall).toBeDefined()
  })

  it('uses GENERIC_FALLBACK_MSG when AI fails and tenant has no custom fallback', async () => {
    setupDbReturns()

    const aiService = {
      call: vi.fn().mockRejectedValue(new Error('AI timeout')),
    }

    await processMessage(baseJob, aiService)

    const insertCall = mockInsertValues.mock.calls.find(
      (call: any[]) => call[0]?.content === GENERIC_FALLBACK_MSG,
    )
    expect(insertCall).toBeDefined()
  })

  it('logs AI failure incident when AI call fails', async () => {
    setupDbReturns()

    const aiService = {
      call: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
    }

    await processMessage(baseJob, aiService)

    expect(mockLogAIFailureIncident).toHaveBeenCalledWith(
      'tenant-1',
      'conv-1',
      'lead-1',
      expect.any(String),
      'API rate limit exceeded',
    )
  })

  it('triggers handoff with error category when AI fails', async () => {
    setupDbReturns()

    const aiService = {
      call: vi.fn().mockRejectedValue(new Error('Server error')),
    }

    await processMessage(baseJob, aiService)

    expect(mockTriggerHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        conversationId: 'conv-1',
        leadId: 'lead-1',
        reason: expect.stringContaining('AI service failure:'),
      }),
    )
  })

  it('uses fallback immediately on CircuitBreakerOpenError', async () => {
    setupDbReturns()

    const aiService = {
      call: vi.fn().mockRejectedValue(new CircuitBreakerOpenError()),
    }

    await processMessage(baseJob, aiService)

    const insertCall = mockInsertValues.mock.calls.find(
      (call: any[]) => call[0]?.content === GENERIC_FALLBACK_MSG,
    )
    expect(insertCall).toBeDefined()

    expect(mockTriggerHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: expect.stringContaining('circuit_breaker_open'),
      }),
    )
  })
})
