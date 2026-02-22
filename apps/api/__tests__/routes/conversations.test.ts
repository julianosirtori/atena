import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

describe('Conversations API', () => {
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

  it('GET /tenants/:id/conversations returns paginated list', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/conversations`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.meta.total).toBeGreaterThanOrEqual(1)
  })

  it('GET /tenants/:id/conversations filters by status', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/conversations?status=closed`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.every((c: { status: string }) => c.status === 'closed')).toBe(true)
  })

  it('GET /tenants/:id/conversations includes lead info', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/conversations`,
    })
    const body = res.json()
    const conv = body.data[0]
    expect(conv).toHaveProperty('leadName')
  })

  it('GET /tenants/:id/conversations/:convId returns detail', async () => {
    const listRes = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/conversations`,
    })
    const convId = listRes.json().data[0].id

    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/conversations/${convId}`,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.id).toBe(convId)
  })

  it('GET /tenants/:id/conversations/:convId/messages returns messages', async () => {
    const listRes = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/conversations`,
    })
    const convId = listRes.json().data[0].id

    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/conversations/${convId}/messages`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.data.length).toBeGreaterThan(0)
    expect(body).toHaveProperty('meta')
  })
})
