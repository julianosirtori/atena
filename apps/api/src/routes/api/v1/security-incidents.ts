import { FastifyPluginAsync } from 'fastify'
import { db, securityIncidents } from '@atena/database'
import { eq, and, count, desc } from 'drizzle-orm'
import {
  paginationSchema,
  getOffset,
  buildPaginatedResponse,
} from '../../../lib/pagination.js'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'
import {
  securityIncidentFiltersSchema,
  securityIncidentResolveSchema,
} from '../../../lib/schemas.js'

export const securityIncidentsRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/security-incidents
  server.get<{ Params: { tenantId: string }; Querystring: Record<string, string> }>(
    '/tenants/:tenantId/security-incidents',
    async (request) => {
      const { tenantId } = request.params
      const pagination = paginationSchema.parse(request.query)
      const filters = securityIncidentFiltersSchema.parse(request.query)

      const conditions = [eq(securityIncidents.tenantId, tenantId)]
      if (filters.severity) conditions.push(eq(securityIncidents.severity, filters.severity))
      if (filters.resolved !== undefined) conditions.push(eq(securityIncidents.resolved, filters.resolved))
      if (filters.incidentType) conditions.push(eq(securityIncidents.incidentType, filters.incidentType))

      const where = and(...conditions)

      const [{ total }] = await db
        .select({ total: count() })
        .from(securityIncidents)
        .where(where)

      const data = await db
        .select()
        .from(securityIncidents)
        .where(where)
        .orderBy(desc(securityIncidents.createdAt))
        .offset(getOffset(pagination.page, pagination.limit))
        .limit(pagination.limit)

      return buildPaginatedResponse(data, total, pagination.page, pagination.limit)
    },
  )

  // GET /tenants/:tenantId/security-incidents/:incidentId
  server.get<{ Params: { tenantId: string; incidentId: string } }>(
    '/tenants/:tenantId/security-incidents/:incidentId',
    async (request) => {
      const { tenantId, incidentId } = request.params
      const [incident] = await db
        .select()
        .from(securityIncidents)
        .where(
          and(
            eq(securityIncidents.id, incidentId),
            eq(securityIncidents.tenantId, tenantId),
          ),
        )
        .limit(1)
      if (!incident) throw new NotFoundError('Security incident')
      return { data: incident }
    },
  )

  // PUT /tenants/:tenantId/security-incidents/:incidentId (resolve)
  server.put<{ Params: { tenantId: string; incidentId: string }; Body: unknown }>(
    '/tenants/:tenantId/security-incidents/:incidentId',
    async (request) => {
      const { tenantId, incidentId } = request.params
      const parsed = securityIncidentResolveSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [existing] = await db
        .select({ id: securityIncidents.id })
        .from(securityIncidents)
        .where(
          and(
            eq(securityIncidents.id, incidentId),
            eq(securityIncidents.tenantId, tenantId),
          ),
        )
        .limit(1)
      if (!existing) throw new NotFoundError('Security incident')

      const [updated] = await db
        .update(securityIncidents)
        .set({
          resolved: true,
          resolvedBy: parsed.data.resolvedBy,
        })
        .where(eq(securityIncidents.id, incidentId))
        .returning()

      return { data: updated }
    },
  )
}
