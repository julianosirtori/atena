import type { FastifyRequest } from 'fastify'
import type {
  ChannelAdapter,
  InboundMessage,
  SendOptions,
  MediaPayload,
  DeliveryResult,
} from './channel.interface.js'

// Z-API webhook payload types (based on documented payloads)
interface ZApiTextPayload {
  phone: string
  messageId: string
  text: { message: string }
  momment: string // Z-API uses "momment" (their typo)
  isGroup: boolean
}

interface ZApiImagePayload {
  phone: string
  messageId: string
  image: { imageUrl: string; caption?: string }
  momment: string
  isGroup: boolean
}

interface ZApiAudioPayload {
  phone: string
  messageId: string
  audio: { audioUrl: string }
  momment: string
  isGroup: boolean
}

type ZApiPayload = ZApiTextPayload | ZApiImagePayload | ZApiAudioPayload

export class ZApiAdapter implements ChannelAdapter {
  private instanceId: string
  private token: string
  private webhookSecret: string

  constructor(config: { instanceId: string; token: string; webhookSecret: string }) {
    this.instanceId = config.instanceId
    this.token = config.token
    this.webhookSecret = config.webhookSecret
  }

  parseInbound(payload: unknown): InboundMessage | null {
    const data = payload as ZApiPayload

    if (!data || typeof data !== 'object' || !('phone' in data)) return null
    if (data.isGroup) return null

    const base = {
      externalId: data.messageId,
      from: data.phone,
      timestamp: new Date(data.momment),
      channel: 'whatsapp' as const,
      raw: payload,
    }

    if ('text' in data && data.text) {
      return { ...base, content: data.text.message }
    }

    if ('image' in data && data.image) {
      return {
        ...base,
        content: data.image.caption || '[imagem]',
        mediaUrl: data.image.imageUrl,
        mediaType: 'image',
      }
    }

    if ('audio' in data && data.audio) {
      return {
        ...base,
        content: '[áudio]',
        mediaUrl: data.audio.audioUrl,
        mediaType: 'audio',
      }
    }

    return null
  }

  async sendMessage(to: string, content: string, _options?: SendOptions): Promise<DeliveryResult> {
    const url = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}/send-text`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: to, message: content }),
      })

      if (!response.ok) {
        return { success: false, error: `Z-API error: ${response.status}` }
      }

      const result = (await response.json()) as { messageId?: string }
      return { success: true, externalId: result.messageId }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async sendMedia(to: string, media: MediaPayload): Promise<DeliveryResult> {
    const endpoint = media.type === 'image' ? 'send-image' : 'send-document'
    const url = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}/${endpoint}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: to,
          image: media.url,
          caption: media.caption,
        }),
      })

      if (!response.ok) {
        return { success: false, error: `Z-API error: ${response.status}` }
      }

      const result = (await response.json()) as { messageId?: string }
      return { success: true, externalId: result.messageId }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  validateWebhook(req: FastifyRequest): boolean {
    const token = (req.headers['x-webhook-token'] as string) || ''
    return token === this.webhookSecret
  }
}
