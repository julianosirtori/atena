import { FastifyPluginAsync } from 'fastify'
import { db, monthlyLeadCounts } from '@atena/database'
import { eq, and, desc } from 'drizzle-orm'

export const billingRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/billing/monthly-counts
  server.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/billing/monthly-counts',
    async (request) => {
      const { tenantId } = request.params
      const data = await db
        .select()
        .from(monthlyLeadCounts)
        .where(eq(monthlyLeadCounts.tenantId, tenantId))
        .orderBy(desc(monthlyLeadCounts.yearMonth))
      return { data }
    },
  )
}
