import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { Queue } from 'bullmq'

// Set required env vars before importing server
process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

const WEBHOOK_SECRET = 'test-webhook-secret-integration'
const TEST_PHONE = '5511988880001'

function zapiPayload(phone: string, text: string, messageId?: string) {
  return {
    phone,
    messageId: messageId ?? `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: { message: text },
    momment: new Date().toISOString(),
    isGroup: false,
  }
}

describe('POST /webhooks/whatsapp', () => {
  let server: FastifyInstance
  let tenantId: string
  let inspectQueue: Queue

  beforeAll(async () => {
    const { db, tenants } = await import('@atena/database')
    const { QUEUE_NAMES } = await import('@atena/config')

    // Create test tenant with known webhook secret
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Webhook Test Tenant',
        slug: `test-webhook-${Date.now()}`,
        businessName: 'Test Business',
        whatsappProvider: 'zapi',
        whatsappConfig: {
          instanceId: 'test-instance',
          token: 'test-token',
          webhookSecret: WEBHOOK_SECRET,
          phone: '5511900000001',
        },
      })
      .returning()

    tenantId = tenant.id

    // Queue instance for inspecting enqueued jobs
    inspectQueue = new Queue(QUEUE_NAMES.PROCESS_MESSAGE, {
      connection: { url: process.env.REDIS_URL },
    })

    // Drain any leftover jobs
    await inspectQueue.drain()

    const { buildServer } = await import('../src/server.js')
    server = await buildServer()
    await server.ready()
  })

  afterAll(async () => {
    const { db, tenants, leads, conversations, messages } = await import('@atena/database')
    const { eq } = await import('drizzle-orm')
    const { closeQueues } = await import('../src/lib/queue.js')

    // Clean up test data in correct FK order
    await db.delete(messages).where(eq(messages.tenantId, tenantId))
    await db.delete(conversations).where(eq(conversations.tenantId, tenantId))
    await db.delete(leads).where(eq(leads.tenantId, tenantId))
    await db.delete(tenants).where(eq(tenants.id, tenantId))

    await inspectQueue.drain()
    await inspectQueue.close()
    await closeQueues()
    await server.close()
  })

  it('returns 200 and creates lead, message, and enqueues job for valid payload', async () => {
    const payload = zapiPayload(TEST_PHONE, 'Oi, quero saber dos produtos')

    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'x-webhook-token': WEBHOOK_SECRET },
      payload,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })

    // Verify lead was created in DB
    const { db, leads } = await import('@atena/database')
    const { and, eq } = await import('drizzle-orm')
    const dbLeads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.phone, TEST_PHONE)))

    expect(dbLeads).toHaveLength(1)
    expect(dbLeads[0].channel).toBe('whatsapp')
    expect(dbLeads[0].stage).toBe('new')

    // Verify message saved
    const { messages } = await import('@atena/database')
    const dbMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.tenantId, tenantId))

    expect(dbMessages.length).toBeGreaterThanOrEqual(1)
    expect(dbMessages[0].direction).toBe('inbound')
    expect(dbMessages[0].senderType).toBe('lead')
    expect(dbMessages[0].content).toBe('Oi, quero saber dos produtos')

    // Verify BullMQ job enqueued
    const jobs = await inspectQueue.getJobs(['waiting'])
    expect(jobs.length).toBeGreaterThanOrEqual(1)
    const job = jobs.find((j) => j.data.tenantId === tenantId)
    expect(job).toBeDefined()
    expect(job!.data.leadId).toBe(dbLeads[0].id)
  })

  it('updates last_contact_at without duplicating lead on second message', async () => {
    const { db, leads, messages } = await import('@atena/database')
    const { and, eq } = await import('drizzle-orm')

    // Get lead state before second message
    const [leadBefore] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.phone, TEST_PHONE)))

    const msgCountBefore = await db
      .select()
      .from(messages)
      .where(eq(messages.tenantId, tenantId))

    const payload = zapiPayload(TEST_PHONE, 'Qual o preço?')

    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'x-webhook-token': WEBHOOK_SECRET },
      payload,
    })

    expect(response.statusCode).toBe(200)

    // Verify no duplicate lead
    const leadsAfter = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.phone, TEST_PHONE)))
    expect(leadsAfter).toHaveLength(1)

    // Verify last_contact_at updated
    expect(leadsAfter[0].lastContactAt!.getTime()).toBeGreaterThanOrEqual(
      leadBefore.lastContactAt!.getTime(),
    )

    // Verify message count increased
    const msgsAfter = await db
      .select()
      .from(messages)
      .where(eq(messages.tenantId, tenantId))
    expect(msgsAfter.length).toBe(msgCountBefore.length + 1)
  })

  it('returns 401 when x-webhook-token header is missing', async () => {
    const payload = zapiPayload('5511988880002', 'Oi')

    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error).toBe('Unauthorized')
  })

  it('returns 400 when body is empty', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: {
        'x-webhook-token': WEBHOOK_SECRET,
        'content-type': 'application/json',
      },
      payload: '',
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when token matches no tenant', async () => {
    const payload = zapiPayload('5511988880003', 'Oi')

    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'x-webhook-token': 'nonexistent-secret-token' },
      payload,
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error).toBe('Tenant not found')
  })

  it('creates conversation with status=ai when no open conversation exists', async () => {
    const newPhone = '5511988880004'
    const payload = zapiPayload(newPhone, 'Primeira mensagem')

    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'x-webhook-token': WEBHOOK_SECRET },
      payload,
    })

    expect(response.statusCode).toBe(200)

    const { db, leads, conversations } = await import('@atena/database')
    const { and, eq } = await import('drizzle-orm')

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.phone, newPhone)))

    const convs = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.leadId, lead.id)))

    expect(convs).toHaveLength(1)
    expect(convs[0].status).toBe('ai')
  })

  it('reuses existing open conversation on subsequent messages', async () => {
    const newPhone = '5511988880005'
    const payload1 = zapiPayload(newPhone, 'Mensagem 1')
    const payload2 = zapiPayload(newPhone, 'Mensagem 2')

    await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'x-webhook-token': WEBHOOK_SECRET },
      payload: payload1,
    })

    await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'x-webhook-token': WEBHOOK_SECRET },
      payload: payload2,
    })

    const { db, leads, conversations } = await import('@atena/database')
    const { and, eq } = await import('drizzle-orm')

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.phone, newPhone)))

    const convs = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.leadId, lead.id)))

    expect(convs).toHaveLength(1)
  })

  it('responds within 100ms for a valid webhook request', async () => {
    const payload = zapiPayload('5511988880006', 'Teste de velocidade')

    const start = performance.now()
    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'x-webhook-token': WEBHOOK_SECRET },
      payload,
    })
    const elapsed = performance.now() - start

    expect(response.statusCode).toBe(200)
    expect(elapsed).toBeLessThan(100)
  })
})
