import crypto from 'crypto'
import type { FastifyRequest } from 'fastify'
import type {
  ChannelAdapter,
  InboundMessage,
  SendOptions,
  MediaPayload,
  DeliveryResult,
} from './channel.interface.js'

interface MetaWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: { display_phone_number: string; phone_number_id: string }
      contacts?: Array<{ profile: { name: string }; wa_id: string }>
      messages?: Array<{
        from: string
        id: string
        timestamp: string
        type: string
        text?: { body: string }
        image?: { id: string; mime_type: string; sha256: string; caption?: string }
        audio?: { id: string; mime_type: string }
        video?: { id: string; mime_type: string }
        document?: { id: string; mime_type: string; filename: string }
      }>
      statuses?: Array<unknown>
    }
    field: string
  }>
}

interface MetaWebhookPayload {
  object: string
  entry: MetaWebhookEntry[]
}

export class MetaWhatsAppAdapter implements ChannelAdapter {
  private token: string
  private phoneNumberId: string
  private appSecret: string
  private verifyToken: string

  constructor(config: {
    token: string
    phoneNumberId: string
    appSecret: string
    verifyToken: string
  }) {
    this.token = config.token
    this.phoneNumberId = config.phoneNumberId
    this.appSecret = config.appSecret
    this.verifyToken = config.verifyToken
  }

  parseInbound(payload: unknown): InboundMessage | null {
    const data = payload as MetaWebhookPayload

    if (!data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) return null

    const message = data.entry[0].changes[0].value.messages[0]

    // Ignore status updates
    if (data.entry[0].changes[0].value.statuses) return null

    const base = {
      externalId: message.id,
      from: message.from,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      channel: 'whatsapp' as const,
      raw: payload,
    }

    switch (message.type) {
      case 'text':
        return { ...base, content: message.text?.body || '' }
      case 'image':
        return {
          ...base,
          content: message.image?.caption || '[imagem]',
          mediaUrl: message.image?.id,
          mediaType: 'image',
        }
      case 'audio':
        return {
          ...base,
          content: '[áudio]',
          mediaUrl: message.audio?.id,
          mediaType: 'audio',
        }
      case 'video':
        return {
          ...base,
          content: '[vídeo]',
          mediaUrl: message.video?.id,
          mediaType: 'video',
        }
      case 'document':
        return {
          ...base,
          content: `[documento: ${message.document?.filename || 'arquivo'}]`,
          mediaUrl: message.document?.id,
          mediaType: 'document',
        }
      default:
        return null
    }
  }

  async sendMessage(to: string, content: string, _options?: SendOptions): Promise<DeliveryResult> {
    const url = `https://graph.facebook.com/v25.0/${this.phoneNumberId}/messages`
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: content },
        }),
      })

      if (!response.ok) {
        return { success: false, error: `Meta API error: ${response.status}` }
      }

      const result = (await response.json()) as { messages?: Array<{ id: string }> }
      return { success: true, externalId: result.messages?.[0]?.id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async sendMedia(to: string, media: MediaPayload): Promise<DeliveryResult> {
    const url = `https://graph.facebook.com/v25.0/${this.phoneNumberId}/messages`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: media.type,
          [media.type]: { link: media.url, caption: media.caption },
        }),
      })

      if (!response.ok) {
        return { success: false, error: `Meta API error: ${response.status}` }
      }

      const result = (await response.json()) as { messages?: Array<{ id: string }> }
      return { success: true, externalId: result.messages?.[0]?.id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  validateWebhook(req: FastifyRequest): boolean {
    const signature = req.headers['x-hub-signature-256'] as string
    if (!signature) return false

    const body = JSON.stringify(req.body)
    const expected =
      'sha256=' + crypto.createHmac('sha256', this.appSecret).update(body).digest('hex')

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }

  /**
   * Handle Meta webhook verification challenge (GET request).
   * Returns the challenge string if valid, null otherwise.
   */
  verifyChallenge(query: {
    'hub.mode'?: string
    'hub.verify_token'?: string
    'hub.challenge'?: string
  }): string | null {
    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === this.verifyToken) {
      return query['hub.challenge'] || null
    }
    return null
  }
}
