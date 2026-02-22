import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@atena/config', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: '0.0.0.0',
  },
}))

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
  leads: {
    id: 'leads.id',
    tenantId: 'leads.tenant_id',
    lastCountedMonth: 'leads.last_counted_month',
  },
  monthlyLeadCounts: {
    id: 'monthly_lead_counts.id',
    tenantId: 'monthly_lead_counts.tenant_id',
    yearMonth: 'monthly_lead_counts.year_month',
    leadCount: 'monthly_lead_counts.lead_count',
    notified80: 'monthly_lead_counts.notified_80',
    notified100: 'monthly_lead_counts.notified_100',
  },
  tenants: { id: 'tenants.id', leadsLimit: 'tenants.leads_limit' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

import { countLeadIfNew } from '../src/services/billing.service.js'

const currentYearMonth = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})()

describe('BillingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = []
    mockInsertValues.mockResolvedValue([])
  })

  it('increments count for a new lead this month', async () => {
    selectResults = [
      [{ lastCountedMonth: null }],              // lead lookup — never counted
      [],                                         // monthlyLeadCounts lookup — no record
      [{ leadsLimit: 300 }],                      // tenant lookup
    ]

    await countLeadIfNew('tenant-1', 'lead-1')

    // Should update lead's lastCountedMonth
    expect(mockUpdate).toHaveBeenCalled()
    // Should insert new monthly lead count
    expect(mockInsert).toHaveBeenCalled()
  })

  it('is idempotent for same lead in same month', async () => {
    selectResults = [
      [{ lastCountedMonth: currentYearMonth }],   // lead already counted this month
    ]

    await countLeadIfNew('tenant-1', 'lead-1')

    // Should not update or insert anything
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('increments count for a lead in a new month', async () => {
    selectResults = [
      [{ lastCountedMonth: '2025-12' }],          // lead counted in old month
      [],                                          // no record for current month
      [{ leadsLimit: 300 }],                       // tenant lookup
    ]

    await countLeadIfNew('tenant-1', 'lead-1')

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
  })

  it('increments existing count when other leads already counted', async () => {
    selectResults = [
      [{ lastCountedMonth: null }],               // lead never counted
      [{                                           // existing monthly record with 1 lead
        id: 'mlc-1',
        leadCount: 1,
        notified80: false,
        notified100: false,
      }],
      [{ leadsLimit: 300 }],                       // tenant lookup
    ]

    await countLeadIfNew('tenant-1', 'lead-2')

    // Should update (not insert) monthly lead count
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('sets notified_80 when reaching 80% of limit', async () => {
    selectResults = [
      [{ lastCountedMonth: null }],
      [{
        id: 'mlc-1',
        leadCount: 239,                            // 239 + 1 = 240 = 80% of 300
        notified80: false,
        notified100: false,
      }],
      [{ leadsLimit: 300 }],
    ]

    await countLeadIfNew('tenant-1', 'lead-80')

    // Should have called update for: lead, monthly count, notified_80 flag
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('sets notified_100 when reaching 100% of limit', async () => {
    selectResults = [
      [{ lastCountedMonth: null }],
      [{
        id: 'mlc-1',
        leadCount: 299,                            // 299 + 1 = 300 = 100% of 300
        notified80: true,                          // already notified 80%
        notified100: false,
      }],
      [{ leadsLimit: 300 }],
    ]

    await countLeadIfNew('tenant-1', 'lead-100')

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('still processes lead even when over limit', async () => {
    selectResults = [
      [{ lastCountedMonth: null }],
      [{
        id: 'mlc-1',
        leadCount: 350,                            // already over limit
        notified80: true,
        notified100: true,
      }],
      [{ leadsLimit: 300 }],
    ]

    // Should not throw
    await expect(countLeadIfNew('tenant-1', 'lead-over')).resolves.toBeUndefined()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('creates new monthly record for a new month', async () => {
    selectResults = [
      [{ lastCountedMonth: '2025-11' }],          // different month
      [],                                          // no monthly record for current month
      [{ leadsLimit: 300 }],
    ]

    await countLeadIfNew('tenant-1', 'lead-new-month')

    // Should insert new monthly lead count record
    expect(mockInsert).toHaveBeenCalled()
  })
})
