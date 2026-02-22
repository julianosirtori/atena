import { FastifyPluginAsync } from 'fastify'
import { db, conversationNotes } from '@atena/database'
import { eq, and, desc } from 'drizzle-orm'
import { ValidationError } from '../../../lib/errors.js'
import { noteCreateSchema } from '../../../lib/schemas.js'

export const notesRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants/:tenantId/conversations/:conversationId/notes
  server.get<{ Params: { tenantId: string; conversationId: string } }>(
    '/tenants/:tenantId/conversations/:conversationId/notes',
    async (request) => {
      const { tenantId, conversationId } = request.params
      const data = await db
        .select()
        .from(conversationNotes)
        .where(
          and(
            eq(conversationNotes.tenantId, tenantId),
            eq(conversationNotes.conversationId, conversationId),
          ),
        )
        .orderBy(desc(conversationNotes.createdAt))
      return { data }
    },
  )

  // POST /tenants/:tenantId/conversations/:conversationId/notes
  server.post<{
    Params: { tenantId: string; conversationId: string }
    Body: unknown
  }>(
    '/tenants/:tenantId/conversations/:conversationId/notes',
    async (request, reply) => {
      const { tenantId, conversationId } = request.params
      const parsed = noteCreateSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [note] = await db
        .insert(conversationNotes)
        .values({
          tenantId,
          conversationId,
          agentId: parsed.data.agentId,
          content: parsed.data.content,
        })
        .returning()

      return reply.status(201).send({ data: note })
    },
  )
}
