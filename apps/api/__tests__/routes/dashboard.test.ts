import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

describe('Dashboard API', () => {
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

  it('GET /tenants/:id/dashboard returns aggregate metrics', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/dashboard`,
    })
    expect(res.statusCode).toBe(200)
    const { data } = res.json()
    expect(data).toHaveProperty('leadsToday')
    expect(data).toHaveProperty('leadsMonth')
    expect(data).toHaveProperty('leadsLimit')
    expect(data).toHaveProperty('avgScore')
    expect(data).toHaveProperty('handoffRate')
    expect(data).toHaveProperty('conversationsByStatus')
    expect(data).toHaveProperty('topIntents')
    expect(data.leadsLimit).toBe(500)
    expect(typeof data.avgScore).toBe('number')
    expect(typeof data.handoffRate).toBe('number')
  })

  it('GET /tenants/:id/dashboard returns 404 for unknown tenant', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/tenants/00000000-0000-0000-0000-000000000000/dashboard',
    })
    expect(res.statusCode).toBe(404)
  })
})
