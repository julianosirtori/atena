import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@atena/config', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
  },
  QUEUE_NAMES: {
    PROCESS_MESSAGE: 'process-message',
    SEND_NOTIFICATION: 'send-notification',
    SCHEDULED: 'scheduled',
  },
}))

const mockUpdateSet = vi.fn().mockReturnValue({
  where: vi.fn().mockResolvedValue([]),
})
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet })

const mockInsertValues = vi.fn().mockResolvedValue([])
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

let selectCallIndex = 0
let selectResults: unknown[][] = []

function createSelectChain(data: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(data),
      }),
    }),
  }
}

vi.mock('@atena/database', () => ({
  db: {
    select: vi.fn(() => {
      const result = selectResults[selectCallIndex] || []
      selectCallIndex++
      return createSelectChain(result)
    }),
    update: vi.fn(() => mockUpdate()),
    insert: vi.fn(() => mockInsert()),
  },
  conversations: {
    id: 'conversations.id',
    tenantId: 'conversations.tenant_id',
    status: 'conversations.status',
    leadId: 'conversations.lead_id',
    assignedAgentId: 'conversations.assigned_agent_id',
  },
  leads: {
    id: 'leads.id',
    tenantId: 'leads.tenant_id',
    name: 'leads.name',
    score: 'leads.score',
    channel: 'leads.channel',
  },
  leadEvents: {},
  messages: {},
  agents: {
    id: 'agents.id',
    activeConversations: 'agents.active_conversations',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}))

vi.mock('bullmq', () => ({
  Queue: vi.fn(),
  Worker: vi.fn(),
}))

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

import {
  triggerHandoff,
  assignToAgent,
  returnToAI,
  closeConversation,
  handleTimeout,
  setQueues,
  InvalidTransitionError,
} from '../src/services/handoff.service.js'

const defaultHandoffRules = {
  score_threshold: 60,
  max_ai_turns: 15,
  business_hours_only: false,
  handoff_intents: ['complaint'],
  auto_handoff_on_price: false,
  follow_up_enabled: false,
  follow_up_delay_hours: 24,
}

describe('HandoffService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = []
    mockInsertValues.mockResolvedValue([])
  })

  describe('triggerHandoff', () => {
    it('transitions ai → waiting_human successfully', async () => {
      selectResults = [
        [{ status: 'ai' }],                                           // conversation lookup
        [{ name: 'Maria', score: 40, channel: 'whatsapp' }],         // lead lookup for notification
      ]

      await triggerHandoff({
        tenantId: 'tenant-1',
        conversationId: 'conv-1',
        leadId: 'lead-1',
        reason: 'Low confidence',
        handoffRules: defaultHandoffRules,
      })

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
    })

    it('throws InvalidTransitionError for closed → waiting_human', async () => {
      selectResults = [[{ status: 'closed' }]]

      await expect(
        triggerHandoff({
          tenantId: 'tenant-1',
          conversationId: 'conv-1',
          leadId: 'lead-1',
          reason: 'test',
          handoffRules: defaultHandoffRules,
        }),
      ).rejects.toThrow(InvalidTransitionError)
    })

    it('throws InvalidTransitionError for human → waiting_human', async () => {
      selectResults = [[{ status: 'human' }]]

      await expect(
        triggerHandoff({
          tenantId: 'tenant-1',
          conversationId: 'conv-1',
          leadId: 'lead-1',
          reason: 'test',
          handoffRules: defaultHandoffRules,
        }),
      ).rejects.toThrow(InvalidTransitionError)
    })
  })

  describe('assignToAgent', () => {
    it('transitions waiting_human → human and increments agent counter', async () => {
      selectResults = [[{ status: 'waiting_human', leadId: 'lead-1' }]]

      await assignToAgent('conv-1', 'agent-1', 'tenant-1')

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
    })

    it('throws InvalidTransitionError for ai → human', async () => {
      selectResults = [[{ status: 'ai', leadId: 'lead-1' }]]

      await expect(
        assignToAgent('conv-1', 'agent-1', 'tenant-1'),
      ).rejects.toThrow(InvalidTransitionError)
    })
  })

  describe('returnToAI', () => {
    it('transitions human → ai successfully', async () => {
      selectResults = [[{ status: 'human', leadId: 'lead-1' }]]

      await returnToAI('conv-1', 'agent-1', 'tenant-1')

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
    })

    it('transitions waiting_human → ai successfully', async () => {
      selectResults = [[{ status: 'waiting_human', leadId: 'lead-1' }]]

      await returnToAI('conv-1', 'agent-1', 'tenant-1')

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('throws InvalidTransitionError for ai → ai (no self-transition)', async () => {
      selectResults = [[{ status: 'ai', leadId: 'lead-1' }]]

      await expect(
        returnToAI('conv-1', 'agent-1', 'tenant-1'),
      ).rejects.toThrow(InvalidTransitionError)
    })
  })

  describe('closeConversation', () => {
    it('transitions human → closed successfully', async () => {
      selectResults = [[{ status: 'human', leadId: 'lead-1', assignedAgentId: 'agent-1' }]]

      await closeConversation('conv-1', 'tenant-1')

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('throws InvalidTransitionError for ai → closed', async () => {
      selectResults = [[{ status: 'ai', leadId: 'lead-1', assignedAgentId: null }]]

      await expect(
        closeConversation('conv-1', 'tenant-1'),
      ).rejects.toThrow(InvalidTransitionError)
    })
  })

  describe('handleTimeout', () => {
    it('reverts waiting_human → ai on timeout', async () => {
      selectResults = [[{ status: 'waiting_human', leadId: 'lead-1' }]]

      await handleTimeout('conv-1', 'tenant-1')

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
    })

    it('noops when conversation is already human', async () => {
      selectResults = [[{ status: 'human', leadId: 'lead-1' }]]

      await handleTimeout('conv-1', 'tenant-1')

      // Should not attempt to update conversation status
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('noops when conversation is already ai', async () => {
      selectResults = [[{ status: 'ai', leadId: 'lead-1' }]]

      await handleTimeout('conv-1', 'tenant-1')

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('InvalidTransitionError', () => {
    it('has correct name and message', () => {
      const error = new InvalidTransitionError('ai', 'closed')
      expect(error.name).toBe('InvalidTransitionError')
      expect(error.message).toBe('Invalid transition: ai → closed')
    })
  })

  describe('setQueues', () => {
    it('accepts queue instances without errors', () => {
      const mockNotif = {} as any
      const mockSched = {} as any
      expect(() => setQueues(mockNotif, mockSched)).not.toThrow()
    })
  })
})
