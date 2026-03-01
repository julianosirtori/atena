import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock database
const mockSelectReturn: unknown[] = []
const mockInsertReturn = { onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }
const mockUpdateReturn = { where: vi.fn().mockResolvedValue(undefined) }

vi.mock('@atena/database', () => {
  const chainedSelect = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(() => mockSelectReturn),
  }
  const chainedInsert = {
    values: vi.fn(() => mockInsertReturn),
  }
  const chainedUpdate = {
    set: vi.fn(() => mockUpdateReturn),
  }

  return {
    db: {
      select: vi.fn(() => chainedSelect),
      insert: vi.fn(() => chainedInsert),
      update: vi.fn(() => chainedUpdate),
    },
    campaigns: { id: 'id', tenantId: 'tenant_id', status: 'status' },
    leads: { id: 'id', activeCampaignId: 'active_campaign_id', updatedAt: 'updated_at' },
    leadCampaigns: {
      tenantId: 'tenant_id',
      leadId: 'lead_id',
      campaignId: 'campaign_id',
    },
    leadEvents: { tenantId: 'tenant_id', leadId: 'lead_id' },
  }
})

describe('Campaign service types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectReturn.length = 0
  })

  it('can import the campaign service module', async () => {
    const mod = await import('../src/services/campaign.service.js')
    expect(mod.matchLeadToCampaign).toBeDefined()
    expect(mod.manualAssociateLeadToCampaign).toBeDefined()
  })

  it('matchLeadToCampaign is a function', async () => {
    const { matchLeadToCampaign } = await import('../src/services/campaign.service.js')
    expect(typeof matchLeadToCampaign).toBe('function')
  })

  it('manualAssociateLeadToCampaign is a function', async () => {
    const { manualAssociateLeadToCampaign } = await import('../src/services/campaign.service.js')
    expect(typeof manualAssociateLeadToCampaign).toBe('function')
  })
})
