import { FastifyPluginAsync } from 'fastify'
import { db, tenants } from '@atena/database'
import { eq } from 'drizzle-orm'
import { ZApiAdapter, MetaWhatsAppAdapter, MockAdapter } from '@atena/channels'
import type { ChannelAdapter } from '@atena/channels'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'
import { tenantUpdateSchema, simulateAiSchema } from '../../../lib/schemas.js'

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

  // POST /tenants/:id/simulate — AI simulation (does not create real data)
  server.post<{ Params: { id: string }; Body: unknown }>(
    '/tenants/:id/simulate',
    async (request) => {
      const { id } = request.params
      const parsed = simulateAiSchema.safeParse(request.body)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten().fieldErrors)
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1)
      if (!tenant) throw new NotFoundError('Tenant')

      // Return a mock response when Claude API is not configured
      const mockResponses = [
        {
          response: `Olá! Obrigado por entrar em contato com a ${tenant.businessName}. Como posso ajudar você hoje?`,
          intent: 'greeting',
          confidence: 0.95,
        },
        {
          response: `Entendo que você tem interesse em nossos serviços. Posso explicar mais detalhes sobre o que oferecemos na ${tenant.businessName}. O que gostaria de saber?`,
          intent: 'product_inquiry',
          confidence: 0.88,
        },
        {
          response: `Nosso horário de funcionamento é ${tenant.businessHours ?? 'de segunda a sexta, das 9h às 18h'}. Deseja agendar um horário?`,
          intent: 'business_hours',
          confidence: 0.92,
        },
      ]

      const mock = mockResponses[Math.floor(Math.random() * mockResponses.length)]

      return { data: mock }
    },
  )

  // GET /tenants/:tenantId/channel-status
  server.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/channel-status',
    async (request) => {
      const { tenantId } = request.params
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)
      if (!tenant) throw new NotFoundError('Tenant')

      const whatsappConfig = (tenant.whatsappConfig ?? {}) as Record<string, string>

      let adapter: ChannelAdapter
      if (tenant.whatsappProvider === 'meta_cloud') {
        adapter = new MetaWhatsAppAdapter({
          token: whatsappConfig.token ?? '',
          phoneNumberId: whatsappConfig.phoneNumberId ?? '',
          appSecret: whatsappConfig.appSecret ?? '',
          verifyToken: whatsappConfig.verifyToken ?? '',
        })
      } else if (
        tenant.whatsappProvider === 'zapi' &&
        whatsappConfig.instanceId &&
        whatsappConfig.token
      ) {
        adapter = new ZApiAdapter({
          instanceId: whatsappConfig.instanceId,
          token: whatsappConfig.token,
          webhookSecret: whatsappConfig.webhookSecret ?? '',
          clientToken: whatsappConfig.clientToken,
        })
      } else {
        adapter = new MockAdapter()
      }

      const whatsappStatus = adapter.checkHealth
        ? await adapter.checkHealth()
        : { online: true }

      return {
        data: {
          whatsapp: { status: whatsappStatus.online ? 'online' : 'offline', error: whatsappStatus.error },
          instagram: { status: 'offline' as const, error: 'Instagram não configurado' },
        },
      }
    },
  )
}
