import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database module
vi.mock('@atena/database', () => {
  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
  }))

  const mockInsert = vi.fn(() => ({
    values: vi.fn().mockResolvedValue([]),
  }))

  return {
    db: {
      update: mockUpdate,
      insert: mockInsert,
    },
    leads: { id: 'leads.id', tenantId: 'leads.tenant_id' },
    leadEvents: {},
  }
})

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
}))

// Mock @atena/config
vi.mock('@atena/config', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
  },
}))

import { evaluateStage, shouldAutoHandoff, updateScore } from '../src/services/scoring.service.js'

describe('evaluateStage', () => {
  it('returns new for score 0', () => {
    expect(evaluateStage(0)).toBe('new')
  })

  it('returns new for score 20', () => {
    expect(evaluateStage(20)).toBe('new')
  })

  it('returns qualifying for score 21', () => {
    expect(evaluateStage(21)).toBe('qualifying')
  })

  it('returns qualifying for score 60', () => {
    expect(evaluateStage(60)).toBe('qualifying')
  })

  it('returns hot for score 61', () => {
    expect(evaluateStage(61)).toBe('hot')
  })

  it('returns hot for score 100', () => {
    expect(evaluateStage(100)).toBe('hot')
  })
})

describe('shouldAutoHandoff', () => {
  it('returns true when score >= threshold', () => {
    expect(shouldAutoHandoff(60, { score_threshold: 60 })).toBe(true)
  })

  it('returns true when score > threshold', () => {
    expect(shouldAutoHandoff(80, { score_threshold: 60 })).toBe(true)
  })

  it('returns false when score < threshold', () => {
    expect(shouldAutoHandoff(50, { score_threshold: 60 })).toBe(false)
  })
})

describe('updateScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clamps score to minimum 0', async () => {
    const result = await updateScore('lead1', 'tenant1', 10, 'new', -20, 'ai')
    expect(result.newScore).toBe(0)
  })

  it('increases score correctly', async () => {
    const result = await updateScore('lead1', 'tenant1', 30, 'qualifying', 15, 'ai')
    expect(result.newScore).toBe(45)
  })

  it('detects stage change from new to qualifying', async () => {
    const result = await updateScore('lead1', 'tenant1', 15, 'new', 10, 'ai')
    expect(result.newScore).toBe(25)
    expect(result.newStage).toBe('qualifying')
    expect(result.stageChanged).toBe(true)
  })

  it('does not change stage for terminal stages like human', async () => {
    const result = await updateScore('lead1', 'tenant1', 80, 'human', 10, 'ai')
    expect(result.newStage).toBe('human')
    expect(result.stageChanged).toBe(false)
  })

  it('does not change stage for converted', async () => {
    const result = await updateScore('lead1', 'tenant1', 80, 'converted', 10, 'ai')
    expect(result.newStage).toBe('converted')
    expect(result.stageChanged).toBe(false)
  })
})
