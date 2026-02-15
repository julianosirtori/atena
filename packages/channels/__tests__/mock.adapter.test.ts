import { describe, it, expect, beforeEach } from 'vitest'
import { MockAdapter } from '../src/mock.adapter.js'

describe('MockAdapter', () => {
  let adapter: MockAdapter

  beforeEach(() => {
    adapter = new MockAdapter()
  })

  describe('parseInbound', () => {
    it('parses text message correctly', () => {
      const result = adapter.parseInbound({
        from: '5511999998888',
        content: 'Oi, vi o anúncio',
      })

      expect(result).not.toBeNull()
      expect(result!.from).toBe('5511999998888')
      expect(result!.content).toBe('Oi, vi o anúncio')
      expect(result!.channel).toBe('whatsapp')
      expect(result!.externalId).toBeDefined()
    })

    it('returns null for invalid payload', () => {
      expect(adapter.parseInbound(null)).toBeNull()
      expect(adapter.parseInbound({})).toBeNull()
      expect(adapter.parseInbound({ from: '123' })).toBeNull()
    })

    it('preserves raw payload', () => {
      const payload = { from: '123', content: 'test' }
      const result = adapter.parseInbound(payload)
      expect(result!.raw).toBe(payload)
    })
  })

  describe('sendMessage', () => {
    it('stores sent message and returns success', async () => {
      const result = await adapter.sendMessage('5511999998888', 'Olá!')

      expect(result.success).toBe(true)
      expect(result.externalId).toBeDefined()
      expect(adapter.getSentMessages()).toHaveLength(1)
      expect(adapter.getLastMessage()!.content).toBe('Olá!')
      expect(adapter.getLastMessage()!.to).toBe('5511999998888')
    })
  })

  describe('sendMedia', () => {
    it('stores media message and returns success', async () => {
      const result = await adapter.sendMedia('5511999998888', {
        url: 'https://example.com/image.jpg',
        type: 'image',
        caption: 'Confira',
      })

      expect(result.success).toBe(true)
      expect(adapter.getLastMessage()!.type).toBe('media')
      expect(adapter.getLastMessage()!.media!.url).toBe('https://example.com/image.jpg')
    })
  })

  describe('validateWebhook', () => {
    it('always returns true for mock', () => {
      expect(adapter.validateWebhook({} as any)).toBe(true)
    })
  })

  describe('test helpers', () => {
    it('clearMessages resets state', async () => {
      await adapter.sendMessage('123', 'msg1')
      await adapter.sendMessage('456', 'msg2')
      expect(adapter.getSentMessages()).toHaveLength(2)

      adapter.clearMessages()
      expect(adapter.getSentMessages()).toHaveLength(0)
    })
  })
})
