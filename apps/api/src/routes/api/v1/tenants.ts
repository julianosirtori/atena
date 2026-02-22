import { FastifyPluginAsync } from 'fastify'
import { db, tenants } from '@atena/database'
import { eq } from 'drizzle-orm'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'
import { tenantUpdateSchema } from '../../../lib/schemas.js'

export const tenantsRoutes: FastifyPluginAsync = async (server) => {
  // GET /tenants - list all tenants (for dropdown)
  server.get('/tenants', async () => {
    const result = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        plan: tenants.plan,
      })
      .from(tenants)
    return { data: result }
  })

  // GET /tenants/:id
  server.get<{ Params: { id: string } }>('/tenants/:id', async (request) => {
    const { id } = request.params
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1)
    if (!tenant) throw new NotFoundError('Tenant')
    return { data: tenant }
  })

  // PUT /tenants/:id
  server.put<{ Params: { id: string }; Body: unknown }>(
    '/tenants/:id',
    async (request) => {
      const { id } = request.params
      const parsed = tenantUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [existing] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1)
      if (!existing) throw new NotFoundError('Tenant')

      const [updated] = await db
        .update(tenants)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(tenants.id, id))
        .returning()

      return { data: updated }
    },
  )
}
