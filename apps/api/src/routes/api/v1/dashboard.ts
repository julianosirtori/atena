import { FastifyPluginAsync } from 'fastify'
import { db, tenants, leads, conversations, messages, monthlyLeadCounts } from '@atena/database'
import { eq, and, sql, count, avg, gte } from 'drizzle-orm'
import { NotFoundError } from '../../../lib/errors.js'

export const dashboardRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/dashboard
  server.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/dashboard',
    async (request) => {
      const { tenantId } = request.params

      const [tenant] = await db
        .select({ id: tenants.id, leadsLimit: tenants.leadsLimit })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)
      if (!tenant) throw new NotFoundError('Tenant')

      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [
        leadsToday,
        monthlyCount,
        avgScoreResult,
        totalConversationsLast30,
        handoffConversationsLast30,
        conversationsByStatus,
        topIntents,
      ] = await Promise.all([
        // Leads created today
        db
          .select({ total: count() })
          .from(leads)
          .where(
            and(
              eq(leads.tenantId, tenantId),
              gte(leads.createdAt, startOfDay),
            ),
          ),
        // Monthly lead count
        db
          .select({ leadCount: monthlyLeadCounts.leadCount })
          .from(monthlyLeadCounts)
          .where(
            and(
              eq(monthlyLeadCounts.tenantId, tenantId),
              eq(monthlyLeadCounts.yearMonth, yearMonth),
            ),
          )
          .limit(1),
        // Average score
        db
          .select({ avg: avg(leads.score) })
          .from(leads)
          .where(eq(leads.tenantId, tenantId)),
        // Total conversations last 30 days
        db
          .select({ total: count() })
          .from(conversations)
          .where(
            and(
              eq(conversations.tenantId, tenantId),
              gte(conversations.createdAt, thirtyDaysAgo),
            ),
          ),
        // Handoff conversations last 30 days
        db
          .select({ total: count() })
          .from(conversations)
          .where(
            and(
              eq(conversations.tenantId, tenantId),
              gte(conversations.createdAt, thirtyDaysAgo),
              sql`${conversations.handoffAt} IS NOT NULL`,
            ),
          ),
        // Conversations by status
        db
          .select({
            status: conversations.status,
            count: count(),
          })
          .from(conversations)
          .where(eq(conversations.tenantId, tenantId))
          .groupBy(conversations.status),
        // Top intents from AI metadata
        db
          .select({
            intent: sql<string>`${messages.aiMetadata}->>'intent'`.as('intent'),
            count: count(),
          })
          .from(messages)
          .where(
            and(
              eq(messages.tenantId, tenantId),
              sql`${messages.aiMetadata}->>'intent' IS NOT NULL`,
            ),
          )
          .groupBy(sql`${messages.aiMetadata}->>'intent'`)
          .orderBy(sql`count(*) DESC`)
          .limit(10),
      ])

      const totalConvs = totalConversationsLast30[0]?.total ?? 0
      const handoffConvs = handoffConversationsLast30[0]?.total ?? 0

      return {
        data: {
          leadsToday: leadsToday[0]?.total ?? 0,
          leadsMonth: monthlyCount[0]?.leadCount ?? 0,
          leadsLimit: tenant.leadsLimit,
          avgScore: Math.round(Number(avgScoreResult[0]?.avg ?? 0)),
          handoffRate: totalConvs > 0 ? Math.round((handoffConvs / totalConvs) * 100) : 0,
          conversationsByStatus: conversationsByStatus.reduce(
            (acc, row) => {
              acc[row.status] = row.count
              return acc
            },
            {} as Record<string, number>,
          ),
          topIntents: topIntents
            .filter((r) => r.intent)
            .map((r) => ({ intent: r.intent, count: r.count })),
        },
      }
    },
  )
}
