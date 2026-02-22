import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

describe('Tenants API', () => {
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

  it('GET /tenants returns list of tenants', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/tenants' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0]).toHaveProperty('id')
    expect(body.data[0]).toHaveProperty('name')
    expect(body.data[0]).toHaveProperty('slug')
  })

  it('GET /tenants/:id returns tenant detail', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/tenants/${tenantId}` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.id).toBe(tenantId)
    expect(body.data.slug).toBe('loja-demo')
    expect(body.data.plan).toBe('pro')
  })

  it('GET /tenants/:id returns 404 for invalid id', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/tenants/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(404)
  })

  it('PUT /tenants/:id updates tenant', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/tenants/${tenantId}`,
      payload: { businessHours: 'Segunda a Sexta: 8h-18h' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.businessHours).toBe('Segunda a Sexta: 8h-18h')
  })

  it('PUT /tenants/:id with invalid body returns 400', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/tenants/${tenantId}`,
      payload: { plan: 'invalid_plan' },
    })
    expect(res.statusCode).toBe(400)
  })
})
