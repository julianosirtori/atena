import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { env } from '@atena/config'
import { healthRoute } from './routes/health.js'

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
  })

  await server.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true,
  })

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await server.register(healthRoute)

  return server
}
