import { FastifyPluginAsync } from 'fastify'
import { db, conversations, leads } from '@atena/database'
import { eq, and, count, desc } from 'drizzle-orm'
import {
  paginationSchema,
  getOffset,
  buildPaginatedResponse,
} from '../../../lib/pagination.js'
import { NotFoundError } from '../../../lib/errors.js'
import { conversationFiltersSchema } from '../../../lib/schemas.js'

export const conversationsRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/conversations
  server.get<{ Params: { tenantId: string }; Querystring: Record<string, string> }>(
    '/tenants/:tenantId/conversations',
    async (request) => {
      const { tenantId } = request.params
      const pagination = paginationSchema.parse(request.query)
      const filters = conversationFiltersSchema.parse(request.query)

      const conditions = [eq(conversations.tenantId, tenantId)]
      if (filters.status) conditions.push(eq(conversations.status, filters.status))
      if (filters.channel) conditions.push(eq(conversations.channel, filters.channel))

      const where = and(...conditions)

      const [{ total }] = await db
        .select({ total: count() })
        .from(conversations)
        .where(where)

      const data = await db
        .select({
          id: conversations.id,
          leadId: conversations.leadId,
          channel: conversations.channel,
          status: conversations.status,
          assignedAgentId: conversations.assignedAgentId,
          aiMessagesCount: conversations.aiMessagesCount,
          humanMessagesCount: conversations.humanMessagesCount,
          leadMessagesCount: conversations.leadMessagesCount,
          aiSummary: conversations.aiSummary,
          handoffReason: conversations.handoffReason,
          handoffAt: conversations.handoffAt,
          openedAt: conversations.openedAt,
          closedAt: conversations.closedAt,
          createdAt: conversations.createdAt,
          leadName: leads.name,
          leadPhone: leads.phone,
          leadScore: leads.score,
          leadStage: leads.stage,
        })
        .from(conversations)
        .leftJoin(leads, eq(conversations.leadId, leads.id))
        .where(where)
        .orderBy(desc(conversations.createdAt))
        .offset(getOffset(pagination.page, pagination.limit))
        .limit(pagination.limit)

      return buildPaginatedResponse(data, total, pagination.page, pagination.limit)
    },
  )

  // GET /tenants/:tenantId/conversations/:conversationId
  server.get<{ Params: { tenantId: string; conversationId: string } }>(
    '/tenants/:tenantId/conversations/:conversationId',
    async (request) => {
      const { tenantId, conversationId } = request.params
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.tenantId, tenantId),
          ),
        )
        .limit(1)
      if (!conversation) throw new NotFoundError('Conversation')
      return { data: conversation }
    },
  )
}
