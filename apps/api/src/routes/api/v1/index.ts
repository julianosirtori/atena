import { FastifyPluginAsync } from 'fastify'
import { tenantsRoutes } from './tenants.js'
import { agentsRoutes } from './agents.js'
import { leadsRoutes } from './leads.js'
import { conversationsRoutes } from './conversations.js'
import { messagesRoutes } from './messages.js'
import { notesRoutes } from './notes.js'
import { leadEventsRoutes } from './lead-events.js'
import { securityIncidentsRoutes } from './security-incidents.js'
import { billingRoutes } from './billing.js'
import { dashboardRoutes } from './dashboard.js'

export const v1Routes: FastifyPluginAsync = async (server) => {
  await server.register(tenantsRoutes)
  await server.register(agentsRoutes)
  await server.register(leadsRoutes)
  await server.register(conversationsRoutes)
  await server.register(messagesRoutes)
  await server.register(notesRoutes)
  await server.register(leadEventsRoutes)
  await server.register(securityIncidentsRoutes)
  await server.register(billingRoutes)
  await server.register(dashboardRoutes)
}
