import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

describe('Leads API', () => {
  let server: FastifyInstance
  let tenantId: string

  beforeAll(async () => {
    const { buildServer } = await import('../../src/server.js')
    server = await buildServer()
    await server.ready()
    const res = await server.inject({ method: 'GET', url: '/api/v1/tenants' })
    const demoTenant = res.json().data.find((t: { slug: string }) => t.slug === 'loja-demo')
    tenantId = demoTenant.id
  })

  afterAll(async () => {
    await server.close()
  })

  it('GET /tenants/:id/leads returns paginated leads', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/leads`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.meta).toHaveProperty('total')
    expect(body.meta).toHaveProperty('page')
    expect(body.meta).toHaveProperty('totalPages')
    expect(body.meta.total).toBeGreaterThanOrEqual(5)
  })

  it('GET /tenants/:id/leads filters by stage', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/leads?stage=hot`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.every((l: { stage: string }) => l.stage === 'hot')).toBe(true)
  })

  it('GET /tenants/:id/leads filters by channel', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/leads?channel=instagram`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.every((l: { channel: string }) => l.channel === 'instagram')).toBe(true)
  })

  it('GET /tenants/:id/leads/:leadId returns lead detail', async () => {
    const listRes = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/leads`,
    })
    const leadId = listRes.json().data[0].id

    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/leads/${leadId}`,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.id).toBe(leadId)
  })

  it('GET /tenants/:id/leads/:leadId returns 404', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/leads/00000000-0000-0000-0000-000000000000`,
    })
    expect(res.statusCode).toBe(404)
  })

  it('PUT /tenants/:id/leads/:leadId updates lead', async () => {
    const listRes = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/leads`,
    })
    const leadId = listRes.json().data[0].id

    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/tenants/${tenantId}/leads/${leadId}`,
      payload: { tags: ['vip', 'promo'] },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.tags).toEqual(['vip', 'promo'])
  })
})
