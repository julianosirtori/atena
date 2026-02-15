import { describe, it, expect } from 'vitest'
import { MetaWhatsAppAdapter } from '../src/meta-whatsapp.adapter.js'
import textPayload from './__fixtures__/meta-payloads/text-message.json'
import statusPayload from './__fixtures__/meta-payloads/status-update.json'

const adapter = new MetaWhatsAppAdapter({
  token: 'test-token',
  phoneNumberId: '987654321',
  appSecret: 'test-app-secret',
  verifyToken: 'test-verify-token',
})

describe('MetaWhatsAppAdapter', () => {
  describe('parseInbound', () => {
    it('converts Meta payload to InboundMessage', () => {
      const result = adapter.parseInbound(textPayload)

      expect(result).not.toBeNull()
      expect(result!.from).toBe('5511999998888')
      expect(result!.content).toBe('Oi, vi o anúncio de vocês')
      expect(result!.externalId).toBe('wamid.HBgNNTUxMTk5OTk5ODg4OBUCABEYEjNFQjBD')
      expect(result!.channel).toBe('whatsapp')
    })

    it('returns null for status updates (delivered/read)', () => {
      const result = adapter.parseInbound(statusPayload)
      expect(result).toBeNull()
    })

    it('returns null for empty payload', () => {
      expect(adapter.parseInbound(null)).toBeNull()
      expect(adapter.parseInbound({})).toBeNull()
    })
  })

  describe('verifyChallenge', () => {
    it('returns challenge when mode=subscribe and token matches', () => {
      const result = adapter.verifyChallenge({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'abc123',
      })
      expect(result).toBe('abc123')
    })

    it('returns null for wrong token', () => {
      const result = adapter.verifyChallenge({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'abc123',
      })
      expect(result).toBeNull()
    })

    it('returns null for wrong mode', () => {
      const result = adapter.verifyChallenge({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'abc123',
      })
      expect(result).toBeNull()
    })
  })

  describe('validateWebhook', () => {
    it('rejects missing signature', () => {
      const req = { headers: {}, body: {} } as any
      expect(adapter.validateWebhook(req)).toBe(false)
    })
  })
})
