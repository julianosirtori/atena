import { FastifyPluginAsync } from 'fastify'
import { db, messages, conversations } from '@atena/database'
import { eq, and, lt, desc, sql } from 'drizzle-orm'
import { messageCursorSchema, sendMessageSchema } from '../../../lib/schemas.js'
import { ValidationError } from '../../../lib/errors.js'

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

  // POST /tenants/:tenantId/conversations/:conversationId/messages
  server.post<{
    Params: { tenantId: string; conversationId: string }
    Body: unknown
  }>(
    '/tenants/:tenantId/conversations/:conversationId/messages',
    async (request) => {
      const { tenantId, conversationId } = request.params
      const parsed = sendMessageSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const { content, senderAgentId } = parsed.data

      const [msg] = await db
        .insert(messages)
        .values({
          tenantId,
          conversationId,
          direction: 'outbound',
          senderType: 'agent',
          senderAgentId,
          content,
          contentType: 'text',
          deliveryStatus: 'sent',
        })
        .returning()

      await db
        .update(conversations)
        .set({
          humanMessagesCount: sql`${conversations.humanMessagesCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.tenantId, tenantId),
          ),
        )

      return { data: msg }
    },
  )
}
