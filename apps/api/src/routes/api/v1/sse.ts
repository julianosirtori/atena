import { FastifyPluginAsync } from 'fastify'
import { db, tenants } from '@atena/database'
import { eq } from 'drizzle-orm'
import { sseManager } from '../../../lib/sse-manager.js'

export const sseRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/events/stream
  server.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/events/stream',
    { config: { rateLimit: false } },
    async (request, reply) => {
      const { tenantId } = request.params

      // Validate tenant exists
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' })
      }

      // SSE headers — bypass Fastify reply lifecycle
      const raw = reply.raw
      raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      // Disable socket timeout for long-lived connection
      request.raw.socket.setTimeout(0)
      request.raw.socket.setKeepAlive(true)

      // Register connection
      const connectionId = sseManager.addConnection(tenantId, raw)

      // Send initial connected event
      raw.write(`event: connected\ndata: {"connectionId":"${connectionId}"}\n\n`)

      // Cleanup on close
      request.raw.on('close', () => {
        sseManager.removeConnection(tenantId, connectionId)
      })

      // Prevent Fastify from sending a response
      reply.hijack()
    },
  )
}
