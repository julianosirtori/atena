import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

// Set required env vars before importing server
process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'
process.env.ADMIN_TOKEN = 'test-admin-token'

describe('Admin endpoints', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    const { buildServer } = await import('../src/server.js')
    server = await buildServer()
    await server.ready()
  })

  afterAll(async () => {
    const { closeQueues } = await import('../src/lib/queue.js')
    await closeQueues()
    await server.close()
  })

  describe('Authentication', () => {
    it('returns 401 when X-Admin-Token is missing', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/queues/status',
      })

      expect(response.statusCode).toBe(401)
      expect(response.json().error).toBe('Unauthorized')
    })

    it('returns 401 when X-Admin-Token is wrong', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/queues/status',
        headers: { 'x-admin-token': 'wrong-token' },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/admin/queues/status', () => {
    it('returns queue counts with valid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/queues/status',
        headers: { 'x-admin-token': 'test-admin-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('process-message')
      expect(body.data).toHaveProperty('send-notification')
      expect(body.data).toHaveProperty('scheduled')
      expect(body.data).toHaveProperty('process-message-dlq')
      expect(body.data).toHaveProperty('send-notification-dlq')
      expect(body.data).toHaveProperty('scheduled-dlq')
    })
  })

  describe('GET /api/v1/admin/dlq', () => {
    it('returns empty array when DLQ has no jobs', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/dlq?limit=10',
        headers: { 'x-admin-token': 'test-admin-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data).toBeInstanceOf(Array)
    })

    it('returns 400 for invalid queue name', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/dlq?queue=invalid-queue',
        headers: { 'x-admin-token': 'test-admin-token' },
      })

      expect(response.statusCode).toBe(400)
    })

    it('accepts valid DLQ queue filter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/dlq?queue=process-message-dlq&limit=5',
        headers: { 'x-admin-token': 'test-admin-token' },
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('POST /api/v1/admin/dlq/:jobId/retry', () => {
    it('returns 400 for invalid DLQ queue name', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/admin/dlq/123/retry',
        headers: {
          'x-admin-token': 'test-admin-token',
          'content-type': 'application/json',
        },
        payload: { queue: 'invalid-queue' },
      })

      expect(response.statusCode).toBe(400)
    })

    it('returns 404 when job does not exist', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/admin/dlq/nonexistent-job-id/retry',
        headers: {
          'x-admin-token': 'test-admin-token',
          'content-type': 'application/json',
        },
        payload: { queue: 'process-message-dlq' },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/v1/admin/dlq/:jobId', () => {
    it('returns 400 for invalid DLQ queue name', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/admin/dlq/123?queue=invalid-queue',
        headers: { 'x-admin-token': 'test-admin-token' },
      })

      expect(response.statusCode).toBe(400)
    })

    it('returns 404 when job does not exist', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/admin/dlq/nonexistent-job-id?queue=process-message-dlq',
        headers: { 'x-admin-token': 'test-admin-token' },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
