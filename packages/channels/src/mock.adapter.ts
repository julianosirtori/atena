import type { FastifyRequest } from 'fastify'
import type {
  ChannelAdapter,
  InboundMessage,
  SendOptions,
  MediaPayload,
  DeliveryResult,
  HealthCheckResult,
} from './channel.interface.js'
import crypto from 'crypto'

export interface MockMessage {
  to: string
  content: string
  timestamp: Date
  type: 'text' | 'media'
  media?: MediaPayload
}

/**
 * Mock adapter for development without Z-API/Meta credentials.
 * Stores sent messages in memory for inspection in tests and local dev.
 */
export class MockAdapter implements ChannelAdapter {
  private sentMessages: MockMessage[] = []

  parseInbound(payload: unknown): InboundMessage | null {
    const data = payload as Record<string, unknown>

    if (!data || typeof data !== 'object') return null

    const from = data.from as string
    const content = data.content as string

    if (!from || !content) return null

    return {
      externalId: (data.externalId as string) || crypto.randomUUID(),
      from,
      content,
      mediaUrl: data.mediaUrl as string | undefined,
      mediaType: data.mediaType as InboundMessage['mediaType'],
      timestamp: data.timestamp ? new Date(data.timestamp as string) : new Date(),
      channel: 'whatsapp',
      raw: payload,
    }
  }

  async sendMessage(to: string, content: string, _options?: SendOptions): Promise<DeliveryResult> {
    const message: MockMessage = {
      to,
      content,
      timestamp: new Date(),
      type: 'text',
    }
    this.sentMessages.push(message)

    return {
      success: true,
      externalId: crypto.randomUUID(),
    }
  }

  async sendMedia(to: string, media: MediaPayload): Promise<DeliveryResult> {
    const message: MockMessage = {
      to,
      content: media.caption || '',
      timestamp: new Date(),
      type: 'media',
      media,
    }
    this.sentMessages.push(message)

    return {
      success: true,
      externalId: crypto.randomUUID(),
    }
  }

  validateWebhook(_req: FastifyRequest): boolean {
    return true
  }

  // Test helpers
  getSentMessages(): MockMessage[] {
    return [...this.sentMessages]
  }

  getLastMessage(): MockMessage | undefined {
    return this.sentMessages[this.sentMessages.length - 1]
  }

  clearMessages(): void {
    this.sentMessages = []
  }

  async checkHealth(): Promise<HealthCheckResult> {
    return { online: true }
  }
}
