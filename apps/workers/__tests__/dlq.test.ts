import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @atena/config
vi.mock('@atena/config', () => ({
  env: {
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
    REDIS_URL: 'redis://localhost:6379',
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

import { moveToDlq } from '../src/lib/dlq.js'

function createMockQueue() {
  return {
    name: 'test-dlq',
    add: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-123',
    queueName: 'process-message',
    data: {
      tenantId: 'tenant-1',
      leadId: 'lead-1',
      conversationId: 'conv-1',
      messageId: 'msg-1',
    },
    attemptsMade: 3,
    ...overrides,
  }
}

describe('moveToDlq', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds job to DLQ with correct data structure', async () => {
    const dlqQueue = createMockQueue()
    const job = createMockJob()

    await moveToDlq(dlqQueue as any, job as any, 'AI service timeout')

    expect(dlqQueue.add).toHaveBeenCalledOnce()
    expect(dlqQueue.add).toHaveBeenCalledWith('dlq-entry', expect.objectContaining({
      originalJobId: 'job-123',
      sourceQueue: 'process-message',
      data: job.data,
      error: 'AI service timeout',
      attemptsMade: 3,
    }))

    // Verify failedAt is an ISO string
    const addCall = dlqQueue.add.mock.calls[0][1]
    expect(addCall.failedAt).toBeDefined()
    expect(new Date(addCall.failedAt).toISOString()).toBe(addCall.failedAt)
  })

  it('preserves original job data', async () => {
    const dlqQueue = createMockQueue()
    const job = createMockJob({
      data: {
        tenantId: 'custom-tenant',
        correlationId: 'corr-abc',
        extra: 'data',
      },
    })

    await moveToDlq(dlqQueue as any, job as any, 'error msg')

    const addCall = dlqQueue.add.mock.calls[0][1]
    expect(addCall.data).toEqual({
      tenantId: 'custom-tenant',
      correlationId: 'corr-abc',
      extra: 'data',
    })
  })

  it('does not throw when DLQ add fails', async () => {
    const dlqQueue = createMockQueue()
    dlqQueue.add.mockRejectedValue(new Error('Redis connection lost'))
    const job = createMockJob()

    // Should not throw
    await expect(moveToDlq(dlqQueue as any, job as any, 'some error')).resolves.toBeUndefined()
  })
})
