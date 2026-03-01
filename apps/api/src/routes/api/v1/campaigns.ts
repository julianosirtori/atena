import { FastifyPluginAsync } from 'fastify'
import { db, campaigns, leadCampaigns, leads, conversations, messages } from '@atena/database'
import { eq, and, count, desc, avg, sql, gte } from 'drizzle-orm'
import {
  paginationSchema,
  getOffset,
  buildPaginatedResponse,
} from '../../../lib/pagination.js'
import { NotFoundError, ValidationError, ApiError } from '../../../lib/errors.js'
import {
  campaignCreateSchema,
  campaignUpdateSchema,
  campaignFiltersSchema,
} from '../../../lib/schemas.js'

export const campaignsRoutes: FastifyPluginAsync = async (server) => {
  // POST /tenants/:tenantId/campaigns
  server.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/tenants/:tenantId/campaigns',
    async (request, reply) => {
      const { tenantId } = request.params
      const parsed = campaignCreateSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const values: Record<string, unknown> = {
        tenantId,
        name: parsed.data.name,
        type: parsed.data.type,
        autoActivate: parsed.data.autoActivate,
        utmRules: parsed.data.utmRules,
        isDefault: parsed.data.isDefault,
      }

      if (parsed.data.description !== undefined) values.description = parsed.data.description
      if (parsed.data.startDate !== undefined) values.startDate = new Date(parsed.data.startDate)
      if (parsed.data.endDate !== undefined) values.endDate = new Date(parsed.data.endDate)
      if (parsed.data.productsInfo !== undefined) values.productsInfo = parsed.data.productsInfo
      if (parsed.data.pricingInfo !== undefined) values.pricingInfo = parsed.data.pricingInfo
      if (parsed.data.faq !== undefined) values.faq = parsed.data.faq
      if (parsed.data.customInstructions !== undefined)
        values.customInstructions = parsed.data.customInstructions
      if (parsed.data.fallbackMessage !== undefined)
        values.fallbackMessage = parsed.data.fallbackMessage
      if (parsed.data.handoffRules !== undefined)
        values.handoffRules = parsed.data.handoffRules
      if (parsed.data.goalLeads !== undefined) values.goalLeads = parsed.data.goalLeads
      if (parsed.data.goalConversions !== undefined)
        values.goalConversions = parsed.data.goalConversions

      const [campaign] = await db
        .insert(campaigns)
        .values(values as typeof campaigns.$inferInsert)
        .returning()

      return reply.status(201).send({ data: campaign })
    },
  )

  // GET /tenants/:tenantId/campaigns
  server.get<{ Params: { tenantId: string }; Querystring: Record<string, string> }>(
    '/tenants/:tenantId/campaigns',
    async (request) => {
      const { tenantId } = request.params
      const pagination = paginationSchema.parse(request.query)
      const filters = campaignFiltersSchema.parse(request.query)

      const conditions = [eq(campaigns.tenantId, tenantId)]
      if (filters.status) conditions.push(eq(campaigns.status, filters.status))
      if (filters.type) conditions.push(eq(campaigns.type, filters.type))

      const where = and(...conditions)

      const [{ total }] = await db
        .select({ total: count() })
        .from(campaigns)
        .where(where)

      const data = await db
        .select()
        .from(campaigns)
        .where(where)
        .orderBy(desc(campaigns.createdAt))
        .offset(getOffset(pagination.page, pagination.limit))
        .limit(pagination.limit)

      return buildPaginatedResponse(data, total, pagination.page, pagination.limit)
    },
  )

  // GET /tenants/:tenantId/campaigns/:campaignId
  server.get<{ Params: { tenantId: string; campaignId: string } }>(
    '/tenants/:tenantId/campaigns/:campaignId',
    async (request) => {
      const { tenantId, campaignId } = request.params
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
        .limit(1)
      if (!campaign) throw new NotFoundError('Campaign')
      return { data: campaign }
    },
  )

  // PUT /tenants/:tenantId/campaigns/:campaignId
  server.put<{ Params: { tenantId: string; campaignId: string }; Body: unknown }>(
    '/tenants/:tenantId/campaigns/:campaignId',
    async (request) => {
      const { tenantId, campaignId } = request.params
      const parsed = campaignUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [existing] = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Campaign')

      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (parsed.data.name !== undefined) updates.name = parsed.data.name
      if (parsed.data.description !== undefined) updates.description = parsed.data.description
      if (parsed.data.type !== undefined) updates.type = parsed.data.type
      if (parsed.data.startDate !== undefined)
        updates.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null
      if (parsed.data.endDate !== undefined)
        updates.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
      if (parsed.data.autoActivate !== undefined) updates.autoActivate = parsed.data.autoActivate
      if (parsed.data.productsInfo !== undefined) updates.productsInfo = parsed.data.productsInfo
      if (parsed.data.pricingInfo !== undefined) updates.pricingInfo = parsed.data.pricingInfo
      if (parsed.data.faq !== undefined) updates.faq = parsed.data.faq
      if (parsed.data.customInstructions !== undefined)
        updates.customInstructions = parsed.data.customInstructions
      if (parsed.data.fallbackMessage !== undefined)
        updates.fallbackMessage = parsed.data.fallbackMessage
      if (parsed.data.handoffRules !== undefined) updates.handoffRules = parsed.data.handoffRules
      if (parsed.data.utmRules !== undefined) updates.utmRules = parsed.data.utmRules
      if (parsed.data.isDefault !== undefined) updates.isDefault = parsed.data.isDefault
      if (parsed.data.goalLeads !== undefined) updates.goalLeads = parsed.data.goalLeads
      if (parsed.data.goalConversions !== undefined)
        updates.goalConversions = parsed.data.goalConversions

      const [updated] = await db
        .update(campaigns)
        .set(updates)
        .where(eq(campaigns.id, campaignId))
        .returning()

      return { data: updated }
    },
  )

  // DELETE /tenants/:tenantId/campaigns/:campaignId
  server.delete<{ Params: { tenantId: string; campaignId: string } }>(
    '/tenants/:tenantId/campaigns/:campaignId',
    async (request, reply) => {
      const { tenantId, campaignId } = request.params
      const [existing] = await db
        .select({ id: campaigns.id, status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Campaign')

      if (existing.status !== 'draft') {
        throw new ApiError(409, 'Only draft campaigns can be deleted')
      }

      await db.delete(campaigns).where(eq(campaigns.id, campaignId))
      return reply.status(204).send()
    },
  )

  // POST /tenants/:tenantId/campaigns/:campaignId/activate
  server.post<{ Params: { tenantId: string; campaignId: string } }>(
    '/tenants/:tenantId/campaigns/:campaignId/activate',
    async (request) => {
      const { tenantId, campaignId } = request.params
      const [existing] = await db
        .select({ id: campaigns.id, status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Campaign')

      if (existing.status !== 'draft' && existing.status !== 'paused') {
        throw new ApiError(409, 'Only draft or paused campaigns can be activated')
      }

      const [updated] = await db
        .update(campaigns)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId))
        .returning()

      return { data: updated }
    },
  )

  // POST /tenants/:tenantId/campaigns/:campaignId/pause
  server.post<{ Params: { tenantId: string; campaignId: string } }>(
    '/tenants/:tenantId/campaigns/:campaignId/pause',
    async (request) => {
      const { tenantId, campaignId } = request.params
      const [existing] = await db
        .select({ id: campaigns.id, status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Campaign')

      if (existing.status !== 'active') {
        throw new ApiError(409, 'Only active campaigns can be paused')
      }

      const [updated] = await db
        .update(campaigns)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId))
        .returning()

      return { data: updated }
    },
  )

  // POST /tenants/:tenantId/campaigns/:campaignId/complete
  server.post<{ Params: { tenantId: string; campaignId: string } }>(
    '/tenants/:tenantId/campaigns/:campaignId/complete',
    async (request) => {
      const { tenantId, campaignId } = request.params
      const [existing] = await db
        .select({ id: campaigns.id, status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Campaign')

      if (existing.status !== 'active' && existing.status !== 'paused') {
        throw new ApiError(409, 'Only active or paused campaigns can be completed')
      }

      const [updated] = await db
        .update(campaigns)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId))
        .returning()

      return { data: updated }
    },
  )

  // GET /tenants/:tenantId/campaigns/:campaignId/metrics
  server.get<{ Params: { tenantId: string; campaignId: string } }>(
    '/tenants/:tenantId/campaigns/:campaignId/metrics',
    async (request) => {
      const { tenantId, campaignId } = request.params

      const [campaign] = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
        .limit(1)
      if (!campaign) throw new NotFoundError('Campaign')

      const [
        totalLeadsResult,
        leadsByStageResult,
        avgScoreResult,
        totalConvResult,
        handoffConvResult,
        convertedResult,
        topIntentsResult,
      ] = await Promise.all([
        // Total leads associated with this campaign
        db
          .select({ total: count() })
          .from(leadCampaigns)
          .where(eq(leadCampaigns.campaignId, campaignId)),

        // Leads by stage
        db
          .select({ stage: leads.stage, count: count() })
          .from(leads)
          .innerJoin(leadCampaigns, eq(leads.id, leadCampaigns.leadId))
          .where(eq(leadCampaigns.campaignId, campaignId))
          .groupBy(leads.stage),

        // Average score of campaign leads
        db
          .select({ avg: avg(leads.score) })
          .from(leads)
          .innerJoin(leadCampaigns, eq(leads.id, leadCampaigns.leadId))
          .where(eq(leadCampaigns.campaignId, campaignId)),

        // Total conversations with this campaign
        db
          .select({ total: count() })
          .from(conversations)
          .where(eq(conversations.campaignId, campaignId)),

        // Handoff conversations
        db
          .select({ total: count() })
          .from(conversations)
          .where(
            and(
              eq(conversations.campaignId, campaignId),
              sql`${conversations.handoffAt} IS NOT NULL`,
            ),
          ),

        // Converted leads
        db
          .select({ total: count() })
          .from(leads)
          .innerJoin(leadCampaigns, eq(leads.id, leadCampaigns.leadId))
          .where(
            and(
              eq(leadCampaigns.campaignId, campaignId),
              eq(leads.stage, 'converted'),
            ),
          ),

        // Top intents from campaign conversations
        db
          .select({
            intent: sql<string>`${messages.aiMetadata}->>'intent'`.as('intent'),
            count: count(),
          })
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(
            and(
              eq(conversations.campaignId, campaignId),
              sql`${messages.aiMetadata}->>'intent' IS NOT NULL`,
            ),
          )
          .groupBy(sql`${messages.aiMetadata}->>'intent'`)
          .orderBy(sql`count(*) DESC`)
          .limit(10),
      ])

      const totalLeads = totalLeadsResult[0]?.total ?? 0
      const totalConvs = totalConvResult[0]?.total ?? 0
      const handoffConvs = handoffConvResult[0]?.total ?? 0
      const converted = convertedResult[0]?.total ?? 0

      return {
        data: {
          totalLeads,
          leadsByStage: leadsByStageResult.reduce(
            (acc, row) => {
              acc[row.stage] = row.count
              return acc
            },
            {} as Record<string, number>,
          ),
          avgScore: Math.round(Number(avgScoreResult[0]?.avg ?? 0)),
          handoffRate: totalConvs > 0 ? Math.round((handoffConvs / totalConvs) * 100) : 0,
          conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
          topIntents: topIntentsResult
            .filter((r) => r.intent)
            .map((r) => ({ intent: r.intent, count: r.count })),
        },
      }
    },
  )
}
