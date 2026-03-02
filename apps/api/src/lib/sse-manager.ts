import Redis from 'ioredis'
import type { ServerResponse } from 'node:http'
import type { SSEEvent } from '@atena/shared'

interface SSEConnection {
  id: string
  response: ServerResponse
}

let connectionCounter = 0

class SSEManager {
  private connections = new Map<string, Set<SSEConnection>>()
  private subscriber: Redis | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  async init(redisUrl: string): Promise<void> {
    this.subscriber = new Redis(redisUrl)

    this.subscriber.on('message', (channel: string, message: string) => {
      // channel = sse:tenant:{tenantId}
      const tenantId = channel.replace('sse:tenant:', '')
      this.broadcast(tenantId, message)
    })

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeats()
    }, 30_000)
  }

  addConnection(tenantId: string, response: ServerResponse): string {
    const id = `conn_${++connectionCounter}`
    const conn: SSEConnection = { id, response }

    let tenantConns = this.connections.get(tenantId)
    if (!tenantConns) {
      tenantConns = new Set()
      this.connections.set(tenantId, tenantConns)
      // Subscribe to this tenant's channel
      this.subscriber?.subscribe(`sse:tenant:${tenantId}`)
    }
    tenantConns.add(conn)

    return id
  }

  removeConnection(tenantId: string, connectionId: string): void {
    const tenantConns = this.connections.get(tenantId)
    if (!tenantConns) return

    for (const conn of tenantConns) {
      if (conn.id === connectionId) {
        tenantConns.delete(conn)
        break
      }
    }

    if (tenantConns.size === 0) {
      this.connections.delete(tenantId)
      this.subscriber?.unsubscribe(`sse:tenant:${tenantId}`)
    }
  }

  private broadcast(tenantId: string, message: string): void {
    const tenantConns = this.connections.get(tenantId)
    if (!tenantConns) return

    let event: SSEEvent
    try {
      event = JSON.parse(message) as SSEEvent
    } catch {
      return
    }

    const frame = `event: ${event.type}\ndata: ${message}\n\n`
    const dead: SSEConnection[] = []

    for (const conn of tenantConns) {
      try {
        conn.response.write(frame)
      } catch {
        dead.push(conn)
      }
    }

    for (const conn of dead) {
      tenantConns.delete(conn)
    }
    if (tenantConns.size === 0) {
      this.connections.delete(tenantId)
      this.subscriber?.unsubscribe(`sse:tenant:${tenantId}`)
    }
  }

  private sendHeartbeats(): void {
    const dead: Array<{ tenantId: string; conn: SSEConnection }> = []

    for (const [tenantId, tenantConns] of this.connections) {
      for (const conn of tenantConns) {
        try {
          conn.response.write(': heartbeat\n\n')
        } catch {
          dead.push({ tenantId, conn })
        }
      }
    }

    for (const { tenantId, conn } of dead) {
      this.removeConnection(tenantId, conn.id)
    }
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Close all client connections
    for (const [, tenantConns] of this.connections) {
      for (const conn of tenantConns) {
        try {
          conn.response.end()
        } catch {
          // ignore
        }
      }
    }
    this.connections.clear()

    if (this.subscriber) {
      await this.subscriber.quit()
      this.subscriber = null
    }
  }

  getConnectionCount(): number {
    let count = 0
    for (const [, conns] of this.connections) {
      count += conns.size
    }
    return count
  }
}

export const sseManager = new SSEManager()
