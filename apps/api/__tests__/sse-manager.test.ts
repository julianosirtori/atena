import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock ioredis before importing sseManager
let messageCallback: ((channel: string, message: string) => void) | null = null
const mockSubscribe = vi.fn()
const mockUnsubscribe = vi.fn()
const mockQuit = vi.fn().mockResolvedValue('OK')

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      subscribe = mockSubscribe
      unsubscribe = mockUnsubscribe
      quit = mockQuit
      on(event: string, cb: (...args: unknown[]) => void) {
        if (event === 'message') {
          messageCallback = cb as (channel: string, message: string) => void
        }
      }
    },
  }
})

// Import after mock
const { sseManager } = await import('../src/lib/sse-manager.js')

function createMockResponse() {
  return {
    write: vi.fn().mockReturnValue(true),
    writeHead: vi.fn(),
    end: vi.fn(),
  } as unknown as import('node:http').ServerResponse
}

describe('SSEManager', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await sseManager.init('redis://localhost:6379')
  })

  afterEach(async () => {
    await sseManager.shutdown()
  })

  it('subscribes to Redis channel on first connection', () => {
    const res = createMockResponse()
    sseManager.addConnection('tenant-1', res)

    expect(mockSubscribe).toHaveBeenCalledWith('sse:tenant:tenant-1')
  })

  it('does not re-subscribe for same tenant', () => {
    const res1 = createMockResponse()
    const res2 = createMockResponse()

    sseManager.addConnection('tenant-1', res1)
    sseManager.addConnection('tenant-1', res2)

    expect(mockSubscribe).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes when last connection is removed', () => {
    const res = createMockResponse()
    const connId = sseManager.addConnection('tenant-1', res)

    sseManager.removeConnection('tenant-1', connId)

    expect(mockUnsubscribe).toHaveBeenCalledWith('sse:tenant:tenant-1')
  })

  it('does not unsubscribe if other connections remain', () => {
    const res1 = createMockResponse()
    const res2 = createMockResponse()

    const connId1 = sseManager.addConnection('tenant-1', res1)
    sseManager.addConnection('tenant-1', res2)

    sseManager.removeConnection('tenant-1', connId1)

    expect(mockUnsubscribe).not.toHaveBeenCalled()
  })

  it('broadcasts Redis messages to all tenant connections', () => {
    const res1 = createMockResponse()
    const res2 = createMockResponse()

    sseManager.addConnection('tenant-1', res1)
    sseManager.addConnection('tenant-1', res2)

    const event = JSON.stringify({
      type: 'new_message',
      data: { conversationId: '123' },
      timestamp: new Date().toISOString(),
    })

    messageCallback?.('sse:tenant:tenant-1', event)

    expect(res1.write).toHaveBeenCalledWith(
      expect.stringContaining('event: new_message'),
    )
    expect(res2.write).toHaveBeenCalledWith(
      expect.stringContaining('event: new_message'),
    )
  })

  it('does not broadcast to other tenants', () => {
    const res1 = createMockResponse()
    const res2 = createMockResponse()

    sseManager.addConnection('tenant-1', res1)
    sseManager.addConnection('tenant-2', res2)

    const event = JSON.stringify({
      type: 'new_message',
      data: { conversationId: '123' },
      timestamp: new Date().toISOString(),
    })

    messageCallback?.('sse:tenant:tenant-1', event)

    expect(res1.write).toHaveBeenCalled()
    expect(res2.write).not.toHaveBeenCalled()
  })

  it('removes dead connections on broadcast failure', () => {
    const res1 = createMockResponse()
    const res2 = createMockResponse()
    ;(res1.write as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('broken pipe')
    })

    sseManager.addConnection('tenant-1', res1)
    sseManager.addConnection('tenant-1', res2)

    const event = JSON.stringify({
      type: 'new_message',
      data: {},
      timestamp: new Date().toISOString(),
    })

    messageCallback?.('sse:tenant:tenant-1', event)

    // res2 should still be written to
    expect(res2.write).toHaveBeenCalled()
    // Connection count should be 1 now
    expect(sseManager.getConnectionCount()).toBe(1)
  })

  it('returns connection count', () => {
    expect(sseManager.getConnectionCount()).toBe(0)

    const res = createMockResponse()
    sseManager.addConnection('tenant-1', res)
    expect(sseManager.getConnectionCount()).toBe(1)
  })

  it('ignores malformed JSON messages', () => {
    const res = createMockResponse()
    sseManager.addConnection('tenant-1', res)

    messageCallback?.('sse:tenant:tenant-1', 'not-json')

    expect(res.write).not.toHaveBeenCalled()
  })
})
