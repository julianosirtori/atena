import { FastifyPluginAsync } from 'fastify'
import { db, leadEvents } from '@atena/database'
import { eq, and, desc } from 'drizzle-orm'
import {
  paginationSchema,
  getOffset,
  buildPaginatedResponse,
} from '../../../lib/pagination.js'
import { leadEventFiltersSchema } from '../../../lib/schemas.js'

export const leadEventsRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/leads/:leadId/events
  server.get<{
    Params: { tenantId: string; leadId: string }
    Querystring: Record<string, string>
  }>(
    '/tenants/:tenantId/leads/:leadId/events',
    async (request) => {
      const { tenantId, leadId } = request.params
      const filters = leadEventFiltersSchema.parse(request.query)

      const conditions = [
        eq(leadEvents.tenantId, tenantId),
        eq(leadEvents.leadId, leadId),
      ]
      if (filters.eventType) conditions.push(eq(leadEvents.eventType, filters.eventType))

      const data = await db
        .select()
        .from(leadEvents)
        .where(and(...conditions))
        .orderBy(desc(leadEvents.createdAt))

      return { data }
    },
  )

  // GET /tenants/:tenantId/events (all events for tenant)
  server.get<{ Params: { tenantId: string }; Querystring: Record<string, string> }>(
    '/tenants/:tenantId/events',
    async (request) => {
      const { tenantId } = request.params
      const pagination = paginationSchema.parse(request.query)
      const filters = leadEventFiltersSchema.parse(request.query)

      const conditions = [eq(leadEvents.tenantId, tenantId)]
      if (filters.eventType) conditions.push(eq(leadEvents.eventType, filters.eventType))

      const where = and(...conditions)

      const data = await db
        .select()
        .from(leadEvents)
        .where(where)
        .orderBy(desc(leadEvents.createdAt))
        .offset(getOffset(pagination.page, pagination.limit))
        .limit(pagination.limit)

      return { data }
    },
  )
}
