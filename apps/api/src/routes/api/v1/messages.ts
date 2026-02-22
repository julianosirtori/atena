import { FastifyPluginAsync } from 'fastify'
import { db, messages } from '@atena/database'
import { eq, and, lt, desc } from 'drizzle-orm'
import { messageCursorSchema } from '../../../lib/schemas.js'

export const messagesRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/conversations/:conversationId/messages
  server.get<{
    Params: { tenantId: string; conversationId: string }
    Querystring: Record<string, string>
  }>(
    '/tenants/:tenantId/conversations/:conversationId/messages',
    async (request) => {
      const { tenantId, conversationId } = request.params
      const { cursor, limit } = messageCursorSchema.parse(request.query)

      const conditions = [
        eq(messages.tenantId, tenantId),
        eq(messages.conversationId, conversationId),
      ]

      if (cursor) {
        // Get the cursor message's createdAt for pagination
        const [cursorMsg] = await db
          .select({ createdAt: messages.createdAt })
          .from(messages)
          .where(eq(messages.id, cursor))
          .limit(1)

        if (cursorMsg?.createdAt) {
          conditions.push(lt(messages.createdAt, cursorMsg.createdAt))
        }
      }

      const data = await db
        .select()
        .from(messages)
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(limit)

      // Return in chronological order (oldest first)
      data.reverse()

      const nextCursor = data.length === limit ? data[0]?.id : undefined

      return { data, meta: { nextCursor } }
    },
  )
}
