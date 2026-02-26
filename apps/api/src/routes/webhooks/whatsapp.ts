import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { ZApiAdapter } from '@atena/channels'
import { processInboundWhatsApp, WebhookError } from '../../services/webhook.service.js'

const adapter = new ZApiAdapter({
  instanceId: 'webhook-receiver',
  token: 'webhook-receiver',
  webhookSecret: '',
})

export const whatsappWebhookRoute: FastifyPluginAsync = async (server) => {
  server.post('/webhooks/whatsapp', async (request, reply) => {
    const correlationId = randomUUID()
    reply.header('X-Correlation-ID', correlationId)

    if (!request.body || typeof request.body !== 'object') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Request body is required' })
    }

    const webhookToken = request.headers['x-webhook-token'] as string | undefined
    if (!webhookToken) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing x-webhook-token header' })
    }

    const inbound = adapter.parseInbound(request.body)
    if (!inbound) {
      return reply.status(200).send({ status: 'ignored' })
    }

    try {
      await processInboundWhatsApp(webhookToken, inbound, correlationId)
      return reply.status(200).send({ status: 'ok' })
    } catch (err) {
      if (err instanceof WebhookError) {
        return reply.status(err.statusCode).send({ error: err.message })
      }
      request.log.error(err, 'Unexpected error processing webhook')
      return reply.status(500).send({ error: 'Internal Server Error' })
    }
  })
}
