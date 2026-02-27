import { describe, it, expect } from 'vitest'
import { ZApiAdapter } from '../src/zapi.adapter.js'
import textPayload from './__fixtures__/zapi-payloads/text-message.json'
import imagePayload from './__fixtures__/zapi-payloads/image-message.json'
import audioPayload from './__fixtures__/zapi-payloads/audio-message.json'
import videoPayload from './__fixtures__/zapi-payloads/video-message.json'
import documentPayload from './__fixtures__/zapi-payloads/document-message.json'
import stickerPayload from './__fixtures__/zapi-payloads/sticker-message.json'
import locationPayload from './__fixtures__/zapi-payloads/location-message.json'
import contactPayload from './__fixtures__/zapi-payloads/contact-message.json'
import reactionPayload from './__fixtures__/zapi-payloads/reaction-message.json'
import buttonResponsePayload from './__fixtures__/zapi-payloads/button-response-message.json'
import listResponsePayload from './__fixtures__/zapi-payloads/list-response-message.json'
import notificationPayload from './__fixtures__/zapi-payloads/notification-message.json'

const adapter = new ZApiAdapter({
  instanceId: 'test-instance',
  token: 'test-token',
  webhookSecret: 'test-secret',
})

describe('ZApiAdapter', () => {
  describe('parseInbound — message types', () => {
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

    it('parses image message without caption — uses [imagem] fallback', () => {
      const payload = { ...imagePayload, image: { ...imagePayload.image, caption: '' } }
      const result = adapter.parseInbound(payload)

      expect(result).not.toBeNull()
      expect(result!.content).toBe('[imagem]')
    })

    it('parses audio message — mediaType=audio', () => {
      const result = adapter.parseInbound(audioPayload)

      expect(result).not.toBeNull()
      expect(result!.mediaType).toBe('audio')
      expect(result!.mediaUrl).toBe('https://example.com/audio.ogg')
      expect(result!.content).toBe('[áudio]')
    })

    it('parses video message — mediaType=video', () => {
      const result = adapter.parseInbound(videoPayload)

      expect(result).not.toBeNull()
      expect(result!.mediaType).toBe('video')
      expect(result!.mediaUrl).toBe('https://example.com/video.mp4')
      expect(result!.content).toBe('Vídeo do produto')
    })

    it('parses video message without caption — uses [vídeo] fallback', () => {
      const payload = { ...videoPayload, video: { ...videoPayload.video, caption: '' } }
      const result = adapter.parseInbound(payload)

      expect(result).not.toBeNull()
      expect(result!.content).toBe('[vídeo]')
    })

    it('parses document message — mediaType=document, uses fileName as content', () => {
      const result = adapter.parseInbound(documentPayload)

      expect(result).not.toBeNull()
      expect(result!.mediaType).toBe('document')
      expect(result!.mediaUrl).toBe('https://example.com/catalogo.pdf')
      expect(result!.content).toBe('catalogo-2026.pdf')
    })

    it('parses sticker message — mediaType=image', () => {
      const result = adapter.parseInbound(stickerPayload)

      expect(result).not.toBeNull()
      expect(result!.mediaType).toBe('image')
      expect(result!.mediaUrl).toBe('https://example.com/sticker.webp')
      expect(result!.content).toBe('[sticker]')
    })

    it('parses location message — formats address in content', () => {
      const result = adapter.parseInbound(locationPayload)

      expect(result).not.toBeNull()
      expect(result!.content).toContain('[localização]')
      expect(result!.content).toContain('Escritório')
      expect(result!.content).toContain('Av. Paulista')
      expect(result!.mediaUrl).toBeUndefined()
      expect(result!.mediaType).toBeUndefined()
    })

    it('parses contact message — includes displayName in content', () => {
      const result = adapter.parseInbound(contactPayload)

      expect(result).not.toBeNull()
      expect(result!.content).toBe('[contato] João Souza')
      expect(result!.mediaUrl).toBeUndefined()
    })

    it('parses button response — extracts message as text content', () => {
      const result = adapter.parseInbound(buttonResponsePayload)

      expect(result).not.toBeNull()
      expect(result!.content).toBe('Quero saber mais')
      expect(result!.mediaType).toBeUndefined()
    })

    it('parses list response — extracts message as text content', () => {
      const result = adapter.parseInbound(listResponsePayload)

      expect(result).not.toBeNull()
      expect(result!.content).toBe('Plano Premium')
      expect(result!.mediaType).toBeUndefined()
    })
  })

  describe('parseInbound — common fields', () => {
    it('always sets channel=whatsapp', () => {
      const result = adapter.parseInbound(textPayload)
      expect(result!.channel).toBe('whatsapp')
    })

    it('preserves original payload in raw', () => {
      const result = adapter.parseInbound(textPayload)
      expect(result!.raw).toBe(textPayload)
    })

    it('extracts senderName from payload', () => {
      const result = adapter.parseInbound(textPayload)
      expect(result!.senderName).toBe('Maria Silva')
    })

    it('handles momment as integer (milliseconds timestamp)', () => {
      const result = adapter.parseInbound(textPayload)
      expect(result!.timestamp).toBeInstanceOf(Date)
      expect(result!.timestamp.getTime()).toBe(1708000200000)
    })
  })

  describe('parseInbound — filtering', () => {
    it('returns null for group messages (isGroup: true)', () => {
      const result = adapter.parseInbound({ ...textPayload, isGroup: true })
      expect(result).toBeNull()
    })

    it('returns null for own messages (fromMe: true)', () => {
      const result = adapter.parseInbound({ ...textPayload, fromMe: true })
      expect(result).toBeNull()
    })

    it('returns null for newsletter messages (isNewsletter: true)', () => {
      const result = adapter.parseInbound({ ...textPayload, isNewsletter: true })
      expect(result).toBeNull()
    })

    it('returns null for broadcast messages (broadcast: true)', () => {
      const result = adapter.parseInbound({ ...textPayload, broadcast: true })
      expect(result).toBeNull()
    })

    it('returns null for notification messages (CALL_MISSED_VOICE)', () => {
      const result = adapter.parseInbound(notificationPayload)
      expect(result).toBeNull()
    })

    it('returns null for reaction messages', () => {
      const result = adapter.parseInbound(reactionPayload)
      expect(result).toBeNull()
    })

    it('returns null for invalid payload (null)', () => {
      expect(adapter.parseInbound(null)).toBeNull()
    })

    it('returns null for invalid payload (empty object)', () => {
      expect(adapter.parseInbound({})).toBeNull()
    })
  })

  describe('validateWebhook', () => {
    it('returns true for valid token', () => {
      const req = { headers: { 'client-token': 'test-secret' } } as any
      expect(adapter.validateWebhook(req)).toBe(true)
    })

    it('returns false for invalid token', () => {
      const req = { headers: { 'client-token': 'wrong-secret' } } as any
      expect(adapter.validateWebhook(req)).toBe(false)
    })

    it('returns false for missing token', () => {
      const req = { headers: {} } as any
      expect(adapter.validateWebhook(req)).toBe(false)
    })
  })
})
