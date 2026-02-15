import { describe, it, expect } from 'vitest'
import { ZApiAdapter } from '../src/zapi.adapter.js'
import textPayload from './__fixtures__/zapi-payloads/text-message.json'
import imagePayload from './__fixtures__/zapi-payloads/image-message.json'
import audioPayload from './__fixtures__/zapi-payloads/audio-message.json'

const adapter = new ZApiAdapter({
  instanceId: 'test-instance',
  token: 'test-token',
  webhookSecret: 'test-secret',
})

describe('ZApiAdapter', () => {
  describe('parseInbound', () => {
    it('parses text message — extracts from, content, externalId, timestamp', () => {
      const result = adapter.parseInbound(textPayload)

      expect(result).not.toBeNull()
      expect(result!.from).toBe('5511999998888')
      expect(result!.content).toBe('Oi, vi o anúncio de vocês')
      expect(result!.externalId).toBe('ABCD1234567890')
      expect(result!.timestamp).toBeInstanceOf(Date)
    })

    it('parses image message — extracts mediaUrl, mediaType=image', () => {
      const result = adapter.parseInbound(imagePayload)

      expect(result).not.toBeNull()
      expect(result!.mediaUrl).toBe('https://example.com/image.jpg')
      expect(result!.mediaType).toBe('image')
      expect(result!.content).toBe('Olha este produto')
    })

    it('parses audio message — mediaType=audio', () => {
      const result = adapter.parseInbound(audioPayload)

      expect(result).not.toBeNull()
      expect(result!.mediaType).toBe('audio')
      expect(result!.mediaUrl).toBe('https://example.com/audio.ogg')
    })

    it('always sets channel=whatsapp', () => {
      const result = adapter.parseInbound(textPayload)
      expect(result!.channel).toBe('whatsapp')
    })

    it('preserves original payload in raw', () => {
      const result = adapter.parseInbound(textPayload)
      expect(result!.raw).toBe(textPayload)
    })

    it('returns null for group messages', () => {
      const result = adapter.parseInbound({ ...textPayload, isGroup: true })
      expect(result).toBeNull()
    })

    it('returns null for invalid payload', () => {
      expect(adapter.parseInbound(null)).toBeNull()
      expect(adapter.parseInbound({})).toBeNull()
    })
  })

  describe('validateWebhook', () => {
    it('returns true for valid token', () => {
      const req = { headers: { 'x-webhook-token': 'test-secret' } } as any
      expect(adapter.validateWebhook(req)).toBe(true)
    })

    it('returns false for invalid token', () => {
      const req = { headers: { 'x-webhook-token': 'wrong-secret' } } as any
      expect(adapter.validateWebhook(req)).toBe(false)
    })

    it('returns false for missing token', () => {
      const req = { headers: {} } as any
      expect(adapter.validateWebhook(req)).toBe(false)
    })
  })
})
