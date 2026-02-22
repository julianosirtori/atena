import { FastifyPluginAsync } from 'fastify'
import { db, leads } from '@atena/database'
import { eq, and, sql, count, desc, ilike, gte, lte } from 'drizzle-orm'
import {
  paginationSchema,
  getOffset,
  buildPaginatedResponse,
} from '../../../lib/pagination.js'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'
import { leadFiltersSchema, leadUpdateSchema } from '../../../lib/schemas.js'

export const leadsRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/leads
  server.get<{ Params: { tenantId: string }; Querystring: Record<string, string> }>(
    '/tenants/:tenantId/leads',
    async (request) => {
      const { tenantId } = request.params
      const pagination = paginationSchema.parse(request.query)
      const filters = leadFiltersSchema.parse(request.query)

      const conditions = [eq(leads.tenantId, tenantId)]

      if (filters.stage) conditions.push(eq(leads.stage, filters.stage))
      if (filters.channel) conditions.push(eq(leads.channel, filters.channel))
      if (filters.minScore != null) conditions.push(gte(leads.score, filters.minScore))
      if (filters.maxScore != null) conditions.push(lte(leads.score, filters.maxScore))
      if (filters.search) {
        conditions.push(
          sql`(${ilike(leads.name, `%${filters.search}%`)} OR ${ilike(leads.phone, `%${filters.search}%`)})`,
        )
      }

      const where = and(...conditions)

      const [{ total }] = await db
        .select({ total: count() })
        .from(leads)
        .where(where)

      const data = await db
        .select()
        .from(leads)
        .where(where)
        .orderBy(desc(leads.lastMessageAt))
        .offset(getOffset(pagination.page, pagination.limit))
        .limit(pagination.limit)

      return buildPaginatedResponse(data, total, pagination.page, pagination.limit)
    },
  )

  // GET /tenants/:tenantId/leads/:leadId
  server.get<{ Params: { tenantId: string; leadId: string } }>(
    '/tenants/:tenantId/leads/:leadId',
    async (request) => {
      const { tenantId, leadId } = request.params
      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
        .limit(1)
      if (!lead) throw new NotFoundError('Lead')
      return { data: lead }
    },
  )

  // PUT /tenants/:tenantId/leads/:leadId
  server.put<{ Params: { tenantId: string; leadId: string }; Body: unknown }>(
    '/tenants/:tenantId/leads/:leadId',
    async (request) => {
      const { tenantId, leadId } = request.params
      const parsed = leadUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [existing] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Lead')

      const [updated] = await db
        .update(leads)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(leads.id, leadId))
        .returning()

      return { data: updated }
    },
  )
}
