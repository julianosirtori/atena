import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database module
vi.mock('@atena/database', () => {
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  const mockWhere = vi.fn()
  const mockUpdate = vi.fn()
  const mockSet = vi.fn()

  const chainedSelect = {
    from: mockFrom.mockReturnThis(),
    where: mockWhere.mockReturnValue([]),
  }

  const chainedUpdate = {
    set: mockSet.mockReturnThis(),
    where: vi.fn().mockResolvedValue({ rowCount: 0 }),
  }

  return {
    db: {
      select: mockSelect.mockReturnValue(chainedSelect),
      update: mockUpdate.mockReturnValue(chainedUpdate),
    },
    campaigns: {
      id: 'campaigns.id',
      tenantId: 'campaigns.tenant_id',
      status: 'campaigns.status',
      autoActivate: 'campaigns.auto_activate',
      startDate: 'campaigns.start_date',
      endDate: 'campaigns.end_date',
      name: 'campaigns.name',
      updatedAt: 'campaigns.updated_at',
    },
    leads: {
      id: 'leads.id',
      activeCampaignId: 'leads.active_campaign_id',
      updatedAt: 'leads.updated_at',
    },
  }
})

vi.mock('@atena/config', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' },
  QUEUE_NAMES: { CAMPAIGN_LIFECYCLE: 'campaign-lifecycle' },
}))

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}))

describe('processCampaignLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('module can be imported', async () => {
    const mod = await import('../src/workers/campaign-lifecycle.worker.js')
    expect(mod.processCampaignLifecycle).toBeDefined()
    expect(typeof mod.processCampaignLifecycle).toBe('function')
  })

  it('startCampaignLifecycleWorker function exists', async () => {
    const mod = await import('../src/workers/campaign-lifecycle.worker.js')
    expect(mod.startCampaignLifecycleWorker).toBeDefined()
    expect(typeof mod.startCampaignLifecycleWorker).toBe('function')
  })
})
