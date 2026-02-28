import { randomUUID } from 'node:crypto'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { ZApiAdapter, MetaWhatsAppAdapter } from '@atena/channels'
import { env } from '@atena/config'
import {
  processInboundZApi,
  processInboundMetaWhatsApp,
  WebhookError,
} from '../../services/webhook.service.js'

const zapiAdapter = new ZApiAdapter({
  instanceId: 'webhook-receiver',
  token: 'webhook-receiver',
  webhookSecret: '',
})

function detectProvider(request: FastifyRequest): 'zapi' | 'meta_cloud' | 'unknown' {
  if (request.headers['x-hub-signature-256']) return 'meta_cloud'
  // Z-API payloads always include instanceId
  const body = request.body as Record<string, unknown> | undefined
  if (body && 'instanceId' in body) return 'zapi'
  return 'unknown'
}

function validateMetaSignature(rawBody: string, signature: string, appSecret: string): boolean {
  if (!signature || !appSecret) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

function extractPhoneNumberId(body: unknown): string | null {
  const data = body as {
    entry?: Array<{
      changes?: Array<{
        value?: { metadata?: { phone_number_id?: string } }
      }>
    }>
  }
  return data?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null
}

export const whatsappWebhookRoute: FastifyPluginAsync = async (server) => {
  // Capture raw body for Meta HMAC validation
  server.addHook('preParsing', async (_request, _reply, payload) => {
    const chunks: Buffer[] = []
    for await (const chunk of payload) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
    }
    const rawBody = Buffer.concat(chunks)
    ;(_request as FastifyRequest & { rawBody?: string }).rawBody = rawBody.toString('utf8')
    return Readable.from(rawBody)
  })

  // GET — Meta webhook verification challenge
  server.get('/webhooks/whatsapp', { config: { rateLimit: false } }, async (request, reply) => {
    const query = request.query as {
      'hub.mode'?: string
      'hub.verify_token'?: string
      'hub.challenge'?: string
    }

    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === env.META_WHATSAPP_VERIFY_TOKEN
    ) {
      const challenge = query['hub.challenge']
      if (challenge) {
        return reply.status(200).type('text/plain').send(challenge)
      }
    }

    return reply.status(403).send({ error: 'Forbidden', message: 'Invalid verify token' })
  })

  // POST — Dual-provider webhook handler
  server.post('/webhooks/whatsapp', { config: { rateLimit: false } }, async (request, reply) => {
    const correlationId = randomUUID()
    reply.header('X-Correlation-ID', correlationId)

    if (!request.body || typeof request.body !== 'object') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Request body is required' })
    }

    const provider = detectProvider(request)

    if (provider === 'zapi') {
      return handleZApi(request, reply, correlationId)
    }

    if (provider === 'meta_cloud') {
      return handleMeta(request, reply, correlationId)
    }

    return reply.status(401).send({ error: 'Unauthorized', message: 'Unknown webhook provider' })
  })
}

async function handleZApi(request: FastifyRequest, reply: FastifyReply, correlationId: string) {
  const body = request.body as { instanceId?: string }
  const instanceId = body?.instanceId
  if (!instanceId) {
    return reply
      .status(400)
      .send({ error: 'Bad Request', message: 'Missing instanceId in payload' })
  }

  const inbound = zapiAdapter.parseInbound(request.body)
  if (!inbound) {
    const payload = request.body as Record<string, unknown>
    request.log.info(
      {
        instanceId,
        fromMe: payload.fromMe,
        isGroup: payload.isGroup,
        hasText: 'text' in payload,
        type: payload.type,
      },
      'Z-API payload ignored (no parseable message)',
    )
    return reply.status(200).send({ status: 'ignored' })
  }

  try {
    await processInboundZApi(instanceId, inbound, correlationId)
    return reply.status(200).send({ status: 'ok' })
  } catch (err) {
    if (err instanceof WebhookError) {
      return reply.status(err.statusCode).send({ error: err.message })
    }
    request.log.error(err, 'Unexpected error processing Z-API webhook')
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

async function handleMeta(request: FastifyRequest, reply: FastifyReply, correlationId: string) {
  const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody ?? ''
  const signature = request.headers['x-hub-signature-256'] as string
  const appSecret = env.META_APP_SECRET ?? ''

  if (!validateMetaSignature(rawBody, signature, appSecret)) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid HMAC signature' })
  }

  const phoneNumberId = extractPhoneNumberId(request.body)
  if (!phoneNumberId) {
    return reply.status(200).send({ status: 'ignored' })
  }

  const metaAdapter = new MetaWhatsAppAdapter({
    token: '',
    phoneNumberId,
    appSecret: '',
    verifyToken: '',
  })

  const inbound = metaAdapter.parseInbound(request.body)
  if (!inbound) {
    return reply.status(200).send({ status: 'ignored' })
  }

  try {
    await processInboundMetaWhatsApp(phoneNumberId, inbound, correlationId)
    return reply.status(200).send({ status: 'ok' })
  } catch (err) {
    if (err instanceof WebhookError) {
      return reply.status(err.statusCode).send({ error: err.message })
    }
    request.log.error(err, 'Unexpected error processing Meta webhook')
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}
