import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

describe('Agents API', () => {
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

  it('GET /tenants/:id/agents returns agent list', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/agents`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('POST /tenants/:id/agents creates agent', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/tenants/${tenantId}/agents`,
      payload: {
        name: 'Test Agent',
        email: `test-${Date.now()}@test.com`,
        password: 'test123456',
        role: 'agent',
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.name).toBe('Test Agent')
  })

  it('POST /tenants/:id/agents with invalid body returns 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/tenants/${tenantId}/agents`,
      payload: { name: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /tenants/:id/agents/:agentId updates agent', async () => {
    const listRes = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${tenantId}/agents`,
    })
    const agentId = listRes.json().data[0].id

    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/tenants/${tenantId}/agents/${agentId}`,
      payload: { name: 'Updated Agent' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('Updated Agent')
  })
})
