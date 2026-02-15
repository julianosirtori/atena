import type { FastifyPluginAsync } from 'fastify'

export const healthRoute: FastifyPluginAsync = async (server) => {
  server.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  })
}
