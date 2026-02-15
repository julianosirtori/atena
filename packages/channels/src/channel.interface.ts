import type { FastifyRequest } from 'fastify'

export interface InboundMessage {
  externalId: string
  from: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'audio' | 'video' | 'document'
  timestamp: Date
  channel: 'whatsapp' | 'instagram'
  raw: unknown
}

export interface SendOptions {
  quotedMessageId?: string
}

export interface MediaPayload {
  url: string
  type: 'image' | 'audio' | 'video' | 'document'
  caption?: string
  filename?: string
}

export interface DeliveryResult {
  success: boolean
  externalId?: string
  error?: string
}

export interface ChannelAdapter {
  parseInbound(payload: unknown): InboundMessage | null
  sendMessage(to: string, content: string, options?: SendOptions): Promise<DeliveryResult>
  sendMedia(to: string, media: MediaPayload): Promise<DeliveryResult>
  validateWebhook(req: FastifyRequest): boolean
}
