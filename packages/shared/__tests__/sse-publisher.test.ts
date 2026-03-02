import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SSEPublisher } from '../src/sse-publisher.js'

// Mock ioredis
const mockPublish = vi.fn().mockResolvedValue(1)
const mockPing = vi.fn().mockResolvedValue('PONG')
const mockQuit = vi.fn().mockResolvedValue('OK')

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      publish = mockPublish
      ping = mockPing
      quit = mockQuit
    },
  }
})

describe('SSEPublisher', () => {
  let publisher: SSEPublisher

  beforeEach(() => {
    vi.clearAllMocks()
    publisher = new SSEPublisher()
  })

  it('silently ignores publish when not initialized', async () => {
    await publisher.publish('tenant-1', 'new_message', { conversationId: '123' })
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('publishes events after init', async () => {
    await publisher.init('redis://localhost:6379')

    await publisher.publish('tenant-1', 'new_message', {
      conversationId: '123',
      messageId: '456',
    })

    expect(mockPublish).toHaveBeenCalledOnce()
    const [channel, payload] = mockPublish.mock.calls[0]
    expect(channel).toBe('sse:tenant:tenant-1')
    const parsed = JSON.parse(payload)
    expect(parsed.type).toBe('new_message')
    expect(parsed.data.conversationId).toBe('123')
    expect(parsed.data.messageId).toBe('456')
    expect(parsed.timestamp).toBeDefined()
  })

  it('publishes to correct tenant channel', async () => {
    await publisher.init('redis://localhost:6379')

    await publisher.publish('tenant-abc', 'handoff_triggered', {
      conversationId: 'c1',
      handoffReason: 'low confidence',
    })

    const [channel] = mockPublish.mock.calls[0]
    expect(channel).toBe('sse:tenant:tenant-abc')
  })

  it('does not throw on publish failure', async () => {
    await publisher.init('redis://localhost:6379')
    mockPublish.mockRejectedValueOnce(new Error('connection lost'))

    await expect(
      publisher.publish('t1', 'lead_updated', { leadId: 'l1' }),
    ).resolves.not.toThrow()
  })

  it('shutdown closes the connection', async () => {
    await publisher.init('redis://localhost:6379')
    await publisher.shutdown()

    expect(mockQuit).toHaveBeenCalledOnce()

    // After shutdown, publish should be a noop
    await publisher.publish('t1', 'new_message', {})
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('shutdown is safe when not initialized', async () => {
    await expect(publisher.shutdown()).resolves.not.toThrow()
  })
})
