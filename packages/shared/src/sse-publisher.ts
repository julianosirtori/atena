import Redis from 'ioredis'
import type { SSEEventType, SSEEventData, SSEEvent } from './sse-events.js'

export class SSEPublisher {
  private client: Redis | null = null

  async init(redisUrl: string): Promise<void> {
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 3 })
    await this.client.ping()
  }

  async publish(
    tenantId: string,
    type: SSEEventType,
    data: SSEEventData,
  ): Promise<void> {
    if (!this.client) return

    const event: SSEEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    }

    try {
      await this.client.publish(
        `sse:tenant:${tenantId}`,
        JSON.stringify(event),
      )
    } catch {
      // Fire-and-forget: log but don't propagate
    }
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
    }
  }
}

export const ssePublisher = new SSEPublisher()
