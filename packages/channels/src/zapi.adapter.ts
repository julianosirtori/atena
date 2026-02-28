import type { FastifyRequest } from 'fastify'
import type {
  ChannelAdapter,
  InboundMessage,
  SendOptions,
  MediaPayload,
  DeliveryResult,
} from './channel.interface.js'

// Z-API ReceivedCallback common fields (present on all webhook payloads)
// Docs: https://developer.z-api.io/webhooks/on-message-received
interface ZApiBasePayload {
  phone: string
  messageId: string
  momment: number // Unix timestamp in milliseconds (Z-API typo: "momment")
  fromMe: boolean
  isGroup: boolean
  isNewsletter?: boolean
  broadcast?: boolean
  senderName?: string
  notification?: string
}

interface ZApiTextPayload extends ZApiBasePayload {
  text: { message: string }
}

interface ZApiImagePayload extends ZApiBasePayload {
  image: { imageUrl: string; caption?: string; mimeType?: string }
}

interface ZApiAudioPayload extends ZApiBasePayload {
  audio: { audioUrl: string; ptt?: boolean; seconds?: number; mimeType?: string }
}

interface ZApiVideoPayload extends ZApiBasePayload {
  video: { videoUrl: string; caption?: string; mimeType?: string; seconds?: number }
}

interface ZApiDocumentPayload extends ZApiBasePayload {
  document: { documentUrl: string; fileName?: string; mimeType?: string; title?: string }
}

interface ZApiStickerPayload extends ZApiBasePayload {
  sticker: { stickerUrl: string; mimeType?: string }
}

interface ZApiLocationPayload extends ZApiBasePayload {
  location: { latitude: number; longitude: number; address?: string; name?: string; url?: string }
}

interface ZApiContactPayload extends ZApiBasePayload {
  contact: { displayName: string; vCard?: string; phones?: string[] }
}

interface ZApiReactionPayload extends ZApiBasePayload {
  reaction: { value: string; reactionBy: string; referencedMessage?: unknown }
}

interface ZApiButtonResponsePayload extends ZApiBasePayload {
  buttonsResponseMessage: { buttonId: string; message: string }
}

interface ZApiListResponsePayload extends ZApiBasePayload {
  listResponseMessage: { message: string; title?: string; selectedRowId?: string }
}

type ZApiPayload =
  | ZApiTextPayload
  | ZApiImagePayload
  | ZApiAudioPayload
  | ZApiVideoPayload
  | ZApiDocumentPayload
  | ZApiStickerPayload
  | ZApiLocationPayload
  | ZApiContactPayload
  | ZApiReactionPayload
  | ZApiButtonResponsePayload
  | ZApiListResponsePayload

export class ZApiAdapter implements ChannelAdapter {
  private instanceId: string
  private token: string
  private webhookSecret: string
  private clientToken: string

  constructor(config: { instanceId: string; token: string; webhookSecret: string; clientToken?: string }) {
    this.instanceId = config.instanceId
    this.token = config.token
    this.webhookSecret = config.webhookSecret
    this.clientToken = config.clientToken ?? ''
  }

  parseInbound(payload: unknown): InboundMessage | null {
    const data = payload as ZApiPayload

    if (!data || typeof data !== 'object' || !('phone' in data)) return null

    // Filter non-conversational messages
    if (data.isGroup) return null
    if (data.fromMe) return null
    if (data.isNewsletter) return null
    if (data.broadcast) return null
    if ('notification' in data && data.notification) return null
    if ('reaction' in data) return null

    const base = {
      externalId: data.messageId,
      from: data.phone,
      timestamp: new Date(data.momment),
      channel: 'whatsapp' as const,
      senderName: data.senderName || undefined,
      raw: payload,
    }

    // Text message
    if ('text' in data && data.text) {
      return { ...base, content: data.text.message }
    }

    // Image message
    if ('image' in data && data.image) {
      return {
        ...base,
        content: data.image.caption || '[imagem]',
        mediaUrl: data.image.imageUrl,
        mediaType: 'image',
      }
    }

    // Audio message
    if ('audio' in data && data.audio) {
      return {
        ...base,
        content: '[áudio]',
        mediaUrl: data.audio.audioUrl,
        mediaType: 'audio',
      }
    }

    // Video message
    if ('video' in data && data.video) {
      return {
        ...base,
        content: data.video.caption || '[vídeo]',
        mediaUrl: data.video.videoUrl,
        mediaType: 'video',
      }
    }

    // Document message
    if ('document' in data && data.document) {
      return {
        ...base,
        content: data.document.fileName || data.document.title || '[documento]',
        mediaUrl: data.document.documentUrl,
        mediaType: 'document',
      }
    }

    // Sticker message (treat as image)
    if ('sticker' in data && data.sticker) {
      return {
        ...base,
        content: '[sticker]',
        mediaUrl: data.sticker.stickerUrl,
        mediaType: 'image',
      }
    }

    // Location message
    if ('location' in data && data.location) {
      const loc = data.location
      const parts = ['[localização]']
      if (loc.name) parts.push(loc.name)
      if (loc.address) parts.push(loc.address)
      return { ...base, content: parts.join(' — ') }
    }

    // Contact/vCard message
    if ('contact' in data && data.contact) {
      return { ...base, content: `[contato] ${data.contact.displayName}` }
    }

    // Button response message (treat as text)
    if ('buttonsResponseMessage' in data && data.buttonsResponseMessage) {
      return { ...base, content: data.buttonsResponseMessage.message }
    }

    // List response message (treat as text)
    if ('listResponseMessage' in data && data.listResponseMessage) {
      return { ...base, content: data.listResponseMessage.message }
    }

    return null
  }

  async sendMessage(to: string, content: string, _options?: SendOptions): Promise<DeliveryResult> {
    const url = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}/send-text`

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.clientToken) headers['Client-Token'] = this.clientToken

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: to, message: content }),
      })

      if (!response.ok) {
        const body = await response.text()
        return { success: false, error: `Z-API error: ${response.status} — ${body}` }
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

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.clientToken) headers['Client-Token'] = this.clientToken

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: to,
          image: media.url,
          caption: media.caption,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        return { success: false, error: `Z-API error: ${response.status} — ${body}` }
      }

      const result = (await response.json()) as { messageId?: string }
      return { success: true, externalId: result.messageId }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  validateWebhook(req: FastifyRequest): boolean {
    const token = (req.headers['client-token'] as string) || ''
    return token === this.webhookSecret
  }
}
