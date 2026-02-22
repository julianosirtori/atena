import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@atena/config', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
    PANEL_URL: 'http://localhost:5173',
  },
  QUEUE_NAMES: {
    PROCESS_MESSAGE: 'process-message',
    SEND_NOTIFICATION: 'send-notification',
    SCHEDULED: 'scheduled',
  },
}))

// Mock grammy
const mockSendMessage = vi.fn().mockResolvedValue({})
const mockBotStart = vi.fn()
const mockBotStop = vi.fn().mockResolvedValue(undefined)
const mockCommand = vi.fn()
const mockOn = vi.fn()

vi.mock('grammy', () => {
  class MockBot {
    command = mockCommand
    on = mockOn
    start = mockBotStart
    stop = mockBotStop
    api = { sendMessage: mockSendMessage }
  }

  class MockInlineKeyboard {
    text() { return this }
    row() { return this }
  }

  return {
    Bot: MockBot,
    InlineKeyboard: MockInlineKeyboard,
  }
})

// Mock ioredis
const mockRedisGet = vi.fn()
const mockRedisSet = vi.fn()
const mockRedisDel = vi.fn()
const mockRedisExists = vi.fn()
const mockRedisExpire = vi.fn()
const mockRedisQuit = vi.fn().mockResolvedValue(undefined)

vi.mock('ioredis', () => {
  class MockRedis {
    get = mockRedisGet
    set = mockRedisSet
    del = mockRedisDel
    exists = mockRedisExists
    expire = mockRedisExpire
    quit = mockRedisQuit
  }
  return { default: MockRedis }
})

// Mock database
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

const mockUpdateSet = vi.fn().mockReturnValue({
  where: vi.fn().mockResolvedValue([]),
})
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet })
const mockInsertValues = vi.fn().mockResolvedValue([])
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

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
  agents: {
    id: 'agents.id',
    tenantId: 'agents.tenant_id',
    telegramChatId: 'agents.telegram_chat_id',
    isActive: 'agents.is_active',
    isOnline: 'agents.is_online',
    name: 'agents.name',
    notificationPreferences: 'agents.notification_preferences',
    activeConversations: 'agents.active_conversations',
  },
  conversations: {
    id: 'conversations.id',
    tenantId: 'conversations.tenant_id',
    leadId: 'conversations.lead_id',
    status: 'conversations.status',
    humanMessagesCount: 'conversations.human_messages_count',
  },
  messages: {},
  leads: {
    id: 'leads.id',
    phone: 'leads.phone',
    name: 'leads.name',
  },
  tenants: {
    id: 'tenants.id',
    whatsappProvider: 'tenants.whatsapp_provider',
    whatsappConfig: 'tenants.whatsapp_config',
  },
  leadEvents: {},
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

vi.mock('../src/services/handoff.service.js', () => ({
  assignToAgent: vi.fn(),
  returnToAI: vi.fn(),
}))

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
  },
}))

import { TelegramBotService } from '../src/services/telegram/telegram.bot.js'
import type { AgentForNotification } from '../src/services/telegram/telegram.types.js'

describe('TelegramBotService', () => {
  let bot: TelegramBotService

  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = []
    mockRedisGet.mockReset()
    mockRedisSet.mockReset()
    mockRedisDel.mockReset()
    mockRedisExists.mockReset()
    mockRedisExpire.mockReset()

    bot = new TelegramBotService('test-token', 'redis://localhost:6379')
  })

  describe('/start command', () => {
    it('registers command handler', () => {
      expect(mockCommand).toHaveBeenCalledWith('start', expect.any(Function))
    })

    it('registers status command handler', () => {
      expect(mockCommand).toHaveBeenCalledWith('status', expect.any(Function))
    })

    it('registers online command handler', () => {
      expect(mockCommand).toHaveBeenCalledWith('online', expect.any(Function))
    })

    it('registers offline command handler', () => {
      expect(mockCommand).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('registers sair command handler', () => {
      expect(mockCommand).toHaveBeenCalledWith('sair', expect.any(Function))
    })
  })

  describe('notifyNewLead', () => {
    it('sends notification to eligible online agents', async () => {
      const agentsToNotify: AgentForNotification[] = [
        {
          id: 'agent-1',
          name: 'João',
          telegramChatId: '123456',
          notificationPreferences: { telegram: true, web_push: true, sound: true },
          isOnline: true,
        },
        {
          id: 'agent-2',
          name: 'Maria',
          telegramChatId: '789012',
          notificationPreferences: { telegram: true, web_push: true, sound: true },
          isOnline: true,
        },
      ]

      await bot.notifyNewLead(
        agentsToNotify,
        'Carlos',
        85,
        'whatsapp',
        'conv-1',
        'Interessado em iPhone',
      )

      expect(mockSendMessage).toHaveBeenCalledTimes(2)
      expect(mockSendMessage).toHaveBeenCalledWith(
        '123456',
        expect.stringContaining('Lead quente: Carlos'),
        expect.objectContaining({ reply_markup: expect.anything() }),
      )
    })

    it('skips agents without telegram chat ID', async () => {
      const agentsToNotify: AgentForNotification[] = [
        {
          id: 'agent-1',
          name: 'João',
          telegramChatId: null,
          notificationPreferences: { telegram: true, web_push: true, sound: true },
          isOnline: true,
        },
      ]

      await bot.notifyNewLead(
        agentsToNotify,
        'Carlos',
        85,
        'whatsapp',
        'conv-1',
        'Test',
      )

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('skips offline agents', async () => {
      const agentsToNotify: AgentForNotification[] = [
        {
          id: 'agent-1',
          name: 'João',
          telegramChatId: '123456',
          notificationPreferences: { telegram: true, web_push: true, sound: true },
          isOnline: false,
        },
      ]

      await bot.notifyNewLead(
        agentsToNotify,
        'Carlos',
        85,
        'whatsapp',
        'conv-1',
        'Test',
      )

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('skips agents with telegram notifications disabled', async () => {
      const agentsToNotify: AgentForNotification[] = [
        {
          id: 'agent-1',
          name: 'João',
          telegramChatId: '123456',
          notificationPreferences: { telegram: false, web_push: true, sound: true },
          isOnline: true,
        },
      ]

      await bot.notifyNewLead(
        agentsToNotify,
        'Carlos',
        85,
        'whatsapp',
        'conv-1',
        'Test',
      )

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('includes score and channel in message format', async () => {
      const agentsToNotify: AgentForNotification[] = [
        {
          id: 'agent-1',
          name: 'João',
          telegramChatId: '123456',
          notificationPreferences: { telegram: true, web_push: true, sound: true },
          isOnline: true,
        },
      ]

      await bot.notifyNewLead(
        agentsToNotify,
        'Maria',
        92,
        'instagram',
        'conv-1',
        'Quer saber preços',
      )

      expect(mockSendMessage).toHaveBeenCalledWith(
        '123456',
        expect.stringContaining('Score: 92 | Canal: instagram'),
        expect.anything(),
      )
    })

    it('handles null lead name gracefully', async () => {
      const agentsToNotify: AgentForNotification[] = [
        {
          id: 'agent-1',
          name: 'João',
          telegramChatId: '123456',
          notificationPreferences: { telegram: true, web_push: true, sound: true },
          isOnline: true,
        },
      ]

      await bot.notifyNewLead(
        agentsToNotify,
        null,
        50,
        'whatsapp',
        'conv-1',
        'Novo lead',
      )

      expect(mockSendMessage).toHaveBeenCalledWith(
        '123456',
        expect.stringContaining('Lead sem nome'),
        expect.anything(),
      )
    })

    it('handles 0 eligible agents', async () => {
      await bot.notifyNewLead([], 'Carlos', 85, 'whatsapp', 'conv-1', 'Test')
      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('callback handlers', () => {
    it('registers callback query handler', () => {
      expect(mockOn).toHaveBeenCalledWith('callback_query:data', expect.any(Function))
    })
  })

  describe('text handler', () => {
    it('registers message text handler', () => {
      expect(mockOn).toHaveBeenCalledWith('message:text', expect.any(Function))
    })
  })

  describe('lifecycle', () => {
    it('starts bot successfully', async () => {
      await bot.start()
      expect(mockBotStart).toHaveBeenCalledOnce()
    })

    it('stops bot and disconnects redis', async () => {
      await bot.stop()
      expect(mockBotStop).toHaveBeenCalledOnce()
      expect(mockRedisQuit).toHaveBeenCalledOnce()
    })
  })
})
