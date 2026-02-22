import type { FastifyInstance } from 'fastify'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends ApiError {
  constructor(details: unknown) {
    super(400, 'Validation error', details)
    this.name = 'ValidationError'
  }
}

export function registerErrorHandler(server: FastifyInstance) {
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      const body: Record<string, unknown> = {
        code: error.name,
        message: error.message,
      }
      if (error.details) body.details = error.details
      return reply.status(error.statusCode).send({ error: body })
    }

    // Fastify errors with statusCode (validation, content-type, etc.)
    const fastifyError = error as { validation?: unknown; statusCode?: number }
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: {
          code: 'ValidationError',
          message: 'Validation error',
          details: fastifyError.validation,
        },
      })
    }

    // Fastify errors with known status codes (e.g., empty JSON body = 400)
    if (fastifyError.statusCode && fastifyError.statusCode >= 400 && fastifyError.statusCode < 500) {
      return reply.status(fastifyError.statusCode).send({
        error: {
          code: 'BadRequest',
          message: (error as Error).message,
        },
      })
    }

    server.log.error(error)
    return reply.status(500).send({
      error: {
        code: 'InternalServerError',
        message: 'Internal server error',
      },
    })
  })
}
