import crypto from 'node:crypto'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { Queue } from 'bullmq'

// Set required env vars before importing server
process.env.DATABASE_URL = 'postgres://atena:atena_dev@postgres:5432/atena'
process.env.REDIS_URL = 'redis://redis:6379'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'
process.env.META_WHATSAPP_VERIFY_TOKEN = 'test-meta-verify-token'
process.env.META_APP_SECRET = 'test-meta-app-secret'

const ZAPI_INSTANCE_ID = 'test-instance-integration'
const TEST_PHONE = '5511988880001'
const META_PHONE_NUMBER_ID = 'meta-phone-id-test-001'
const META_TEST_PHONE = '5511977770001'
const META_APP_SECRET = 'test-meta-app-secret'
const META_VERIFY_TOKEN = 'test-meta-verify-token'

function zapiPayload(phone: string, text: string, instanceId?: string, messageId?: string) {
  return {
    type: 'ReceivedCallback',
    instanceId: instanceId ?? ZAPI_INSTANCE_ID,
    phone,
    messageId: messageId ?? `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: { message: text },
    momment: Date.now(),
    fromMe: false,
    isGroup: false,
    isNewsletter: false,
    broadcast: false,
    senderName: 'Test Lead',
    status: 'RECEIVED',
  }
}

function metaTextPayload(phone: string, text: string, phoneNumberId: string, messageId?: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550001234',
                phone_number_id: phoneNumberId,
              },
              contacts: [{ profile: { name: 'Test Lead' }, wa_id: phone }],
              messages: [
                {
                  from: phone,
                  id: messageId ?? `wamid.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }
}

function metaStatusPayload(phoneNumberId: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550001234',
                phone_number_id: phoneNumberId,
              },
              statuses: [
                {
                  id: 'wamid.status123',
                  status: 'delivered',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: '5511999998888',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }
}

function computeHmac(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

describe('POST /webhooks/whatsapp (Z-API)', () => {
  let server: FastifyInstance
  let tenantId: string
  let inspectQueue: Queue

  beforeAll(async () => {
    const { db, tenants } = await import('@atena/database')
    const { QUEUE_NAMES } = await import('@atena/config')

    // Create test tenant with known instanceId
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Webhook Test Tenant',
        slug: `test-webhook-${Date.now()}`,
        businessName: 'Test Business',
        whatsappProvider: 'zapi',
        whatsappConfig: {
          instanceId: ZAPI_INSTANCE_ID,
          token: 'test-token',
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

    // Verify BullMQ job enqueued (check all states — job may already be active/completed)
    const jobs = await inspectQueue.getJobs(['waiting', 'active', 'completed', 'delayed'])
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

  it('returns 401 when payload has no instanceId (unknown provider)', async () => {
    const payload = {
      phone: '5511988880002',
      messageId: 'MSG-NO-INSTANCE',
      text: { message: 'Oi' },
      momment: Date.now(),
      fromMe: false,
      isGroup: false,
    }

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
      headers: { 'content-type': 'application/json' },
      payload: '',
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when instanceId matches no tenant', async () => {
    const payload = zapiPayload('5511988880003', 'Oi', 'nonexistent-instance-id')

    const response = await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
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
      payload: payload1,
    })

    await server.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
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
      payload,
    })
    const elapsed = performance.now() - start

    expect(response.statusCode).toBe(200)
    expect(elapsed).toBeLessThan(100)
  })
})

describe('Meta Cloud API Webhooks', () => {
  let server: FastifyInstance
  let metaTenantId: string
  let inspectQueue: Queue

  beforeAll(async () => {
    const { db, tenants } = await import('@atena/database')
    const { QUEUE_NAMES } = await import('@atena/config')

    // Create test tenant with Meta Cloud provider
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Meta Webhook Test Tenant',
        slug: `test-meta-webhook-${Date.now()}`,
        businessName: 'Meta Test Business',
        whatsappProvider: 'meta_cloud',
        whatsappConfig: {
          phoneNumberId: META_PHONE_NUMBER_ID,
          token: 'meta-access-token',
          appSecret: META_APP_SECRET,
          verifyToken: META_VERIFY_TOKEN,
        },
      })
      .returning()

    metaTenantId = tenant.id

    inspectQueue = new Queue(QUEUE_NAMES.PROCESS_MESSAGE, {
      connection: { url: process.env.REDIS_URL },
    })

    await inspectQueue.drain()

    const { buildServer } = await import('../src/server.js')
    server = await buildServer()
    await server.ready()
  })

  afterAll(async () => {
    const { db, tenants, leads, conversations, messages } = await import('@atena/database')
    const { eq } = await import('drizzle-orm')
    const { closeQueues } = await import('../src/lib/queue.js')

    await db.delete(messages).where(eq(messages.tenantId, metaTenantId))
    await db.delete(conversations).where(eq(conversations.tenantId, metaTenantId))
    await db.delete(leads).where(eq(leads.tenantId, metaTenantId))
    await db.delete(tenants).where(eq(tenants.id, metaTenantId))

    await inspectQueue.drain()
    await inspectQueue.close()
    await closeQueues()
    await server.close()
  })

  describe('GET /webhooks/whatsapp (verification challenge)', () => {
    it('returns 200 with challenge when verify_token is correct', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': META_VERIFY_TOKEN,
          'hub.challenge': 'challenge_token_12345',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('text/plain')
      expect(response.body).toBe('challenge_token_12345')
    })

    it('returns 403 when verify_token is wrong', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'challenge_token_12345',
        },
      })

      expect(response.statusCode).toBe(403)
      expect(response.json().error).toBe('Forbidden')
    })

    it('returns 403 when hub.mode is not subscribe', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/webhooks/whatsapp',
        query: {
          'hub.mode': 'unsubscribe',
          'hub.verify_token': META_VERIFY_TOKEN,
          'hub.challenge': 'challenge_token_12345',
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('POST /webhooks/whatsapp (Meta inbound)', () => {
    it('returns 200 and creates lead, message, and enqueues job for valid Meta payload', async () => {
      const payload = metaTextPayload(META_TEST_PHONE, 'Olá, vim pelo Instagram', META_PHONE_NUMBER_ID)
      const body = JSON.stringify(payload)
      const signature = computeHmac(body, META_APP_SECRET)

      const response = await server.inject({
        method: 'POST',
        url: '/webhooks/whatsapp',
        headers: {
          'x-hub-signature-256': signature,
          'content-type': 'application/json',
        },
        body,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ok' })

      // Verify lead was created
      const { db, leads } = await import('@atena/database')
      const { and, eq } = await import('drizzle-orm')
      const dbLeads = await db
        .select()
        .from(leads)
        .where(and(eq(leads.tenantId, metaTenantId), eq(leads.phone, META_TEST_PHONE)))

      expect(dbLeads).toHaveLength(1)
      expect(dbLeads[0].channel).toBe('whatsapp')

      // Verify message saved
      const { messages } = await import('@atena/database')
      const dbMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.tenantId, metaTenantId))

      expect(dbMessages.length).toBeGreaterThanOrEqual(1)
      const msg = dbMessages.find((m) => m.content === 'Olá, vim pelo Instagram')
      expect(msg).toBeDefined()
      expect(msg!.direction).toBe('inbound')
      expect(msg!.senderType).toBe('lead')

      // Verify BullMQ job enqueued
      const jobs = await inspectQueue.getJobs(['waiting'])
      const job = jobs.find((j) => j.data.tenantId === metaTenantId)
      expect(job).toBeDefined()
      expect(job!.data.leadId).toBe(dbLeads[0].id)
    })

    it('returns 401 when HMAC signature is invalid', async () => {
      const payload = metaTextPayload(META_TEST_PHONE, 'Mensagem com HMAC errado', META_PHONE_NUMBER_ID)
      const body = JSON.stringify(payload)

      const response = await server.inject({
        method: 'POST',
        url: '/webhooks/whatsapp',
        headers: {
          'x-hub-signature-256': 'sha256=invalid_signature_here',
          'content-type': 'application/json',
        },
        body,
      })

      expect(response.statusCode).toBe(401)
      expect(response.json().error).toBe('Unauthorized')
    })

    it('returns 200 with ignored status for status update payloads', async () => {
      const payload = metaStatusPayload(META_PHONE_NUMBER_ID)
      const body = JSON.stringify(payload)
      const signature = computeHmac(body, META_APP_SECRET)

      const response = await server.inject({
        method: 'POST',
        url: '/webhooks/whatsapp',
        headers: {
          'x-hub-signature-256': signature,
          'content-type': 'application/json',
        },
        body,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ignored' })
    })

    it('returns 404 when phoneNumberId matches no tenant', async () => {
      const payload = metaTextPayload(META_TEST_PHONE, 'Teste', 'unknown-phone-id')
      const body = JSON.stringify(payload)
      const signature = computeHmac(body, META_APP_SECRET)

      const response = await server.inject({
        method: 'POST',
        url: '/webhooks/whatsapp',
        headers: {
          'x-hub-signature-256': signature,
          'content-type': 'application/json',
        },
        body,
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error).toBe('Tenant not found')
    })

    it('Z-API tenant lookup uses instanceId from payload body', async () => {
      // Create a Z-API tenant for this test
      const { db, tenants } = await import('@atena/database')
      const testInstanceId = `inst-lookup-test-${Date.now()}`

      const [zapiTenant] = await db
        .insert(tenants)
        .values({
          name: 'Z-API InstanceId Tenant',
          slug: `test-zapi-instance-${Date.now()}`,
          businessName: 'InstanceId Business',
          whatsappProvider: 'zapi',
          whatsappConfig: {
            instanceId: testInstanceId,
            token: 'some-token',
            phone: '5511900000099',
          },
        })
        .returning()

      try {
        const payload = zapiPayload('5511988880099', 'Teste instanceId Z-API', testInstanceId)

        const response = await server.inject({
          method: 'POST',
          url: '/webhooks/whatsapp',
          payload,
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ status: 'ok' })
      } finally {
        // Clean up
        const { eq } = await import('drizzle-orm')
        const { leads, conversations, messages } = await import('@atena/database')
        await db.delete(messages).where(eq(messages.tenantId, zapiTenant.id))
        await db.delete(conversations).where(eq(conversations.tenantId, zapiTenant.id))
        await db.delete(leads).where(eq(leads.tenantId, zapiTenant.id))
        await db.delete(tenants).where(eq(tenants.id, zapiTenant.id))
      }
    })
  })
})
