import { FastifyPluginAsync } from 'fastify'
import { db, tenants, agents } from '@atena/database'
import { eq, and } from 'drizzle-orm'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'
import { agentCreateSchema, agentUpdateSchema } from '../../../lib/schemas.js'

export const agentsRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/agents
  server.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/agents',
    async (request) => {
      const { tenantId } = request.params
      const result = await db
        .select({
          id: agents.id,
          name: agents.name,
          email: agents.email,
          role: agents.role,
          isActive: agents.isActive,
          isOnline: agents.isOnline,
          maxConcurrent: agents.maxConcurrent,
          activeConversations: agents.activeConversations,
          telegramChatId: agents.telegramChatId,
          notificationPreferences: agents.notificationPreferences,
          createdAt: agents.createdAt,
        })
        .from(agents)
        .where(eq(agents.tenantId, tenantId))
      return { data: result }
    },
  )

  // POST /tenants/:tenantId/agents
  server.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/tenants/:tenantId/agents',
    async (request, reply) => {
      const { tenantId } = request.params
      const parsed = agentCreateSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)
      if (!tenant) throw new NotFoundError('Tenant')

      const [agent] = await db
        .insert(agents)
        .values({
          tenantId,
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash: `hashed_${parsed.data.password}`, // TODO: use bcrypt
          role: parsed.data.role,
          telegramChatId: parsed.data.telegramChatId,
          maxConcurrent: parsed.data.maxConcurrent,
          notificationPreferences: parsed.data.notificationPreferences,
        })
        .returning()

      return reply.status(201).send({ data: agent })
    },
  )

  // PUT /tenants/:tenantId/agents/:agentId
  server.put<{ Params: { tenantId: string; agentId: string }; Body: unknown }>(
    '/tenants/:tenantId/agents/:agentId',
    async (request) => {
      const { tenantId, agentId } = request.params
      const parsed = agentUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [existing] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Agent')

      const [updated] = await db
        .update(agents)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(agents.id, agentId))
        .returning()

      return { data: updated }
    },
  )

  // DELETE /tenants/:tenantId/agents/:agentId
  server.delete<{ Params: { tenantId: string; agentId: string } }>(
    '/tenants/:tenantId/agents/:agentId',
    async (request, reply) => {
      const { tenantId, agentId } = request.params

      const [existing] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
        .limit(1)
      if (!existing) throw new NotFoundError('Agent')

      await db.delete(agents).where(eq(agents.id, agentId))
      return reply.status(204).send()
    },
  )
}
