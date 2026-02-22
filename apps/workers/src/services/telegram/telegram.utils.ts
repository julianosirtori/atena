import { MockAdapter, ZApiAdapter, MetaWhatsAppAdapter } from '@atena/channels'
import type { ChannelAdapter } from '@atena/channels'

export function resolveAdapter(tenant: {
  whatsappProvider: string | null
  whatsappConfig: unknown
}): ChannelAdapter {
  const config = tenant.whatsappConfig as Record<string, string> | null
  const instanceId = config?.instanceId

  if (!instanceId || instanceId === 'mock') {
    return new MockAdapter()
  }

  if (tenant.whatsappProvider === 'meta_cloud' && config) {
    return new MetaWhatsAppAdapter({
      token: config.token || '',
      phoneNumberId: config.phoneNumberId || '',
      appSecret: config.appSecret || '',
      verifyToken: config.verifyToken || '',
    })
  }

  if (config) {
    return new ZApiAdapter({
      instanceId: config.instanceId || '',
      token: config.token || '',
      webhookSecret: config.webhookSecret || '',
    })
  }

  return new MockAdapter()
}
