import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

// Set required env vars before importing server (which imports env)
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/atena_test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

describe('GET /health', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    const { buildServer } = await import('../src/server.js')
    server = await buildServer()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it('returns 200 with { status: ok }', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('ok')
  })

  it('returns a valid ISO 8601 timestamp', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    })

    const body = response.json()
    const parsed = new Date(body.timestamp)
    expect(parsed.toISOString()).toBe(body.timestamp)
  })

  it('returns Content-Type application/json', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.headers['content-type']).toContain('application/json')
  })
})
