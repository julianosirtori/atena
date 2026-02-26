import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

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

// PostgreSQL error codes that indicate invalid client input
function isPostgresClientError(error: unknown): boolean {
  const pgError = error as { code?: string }
  // 22P02 = invalid_text_representation (e.g., invalid UUID)
  // 22003 = numeric_value_out_of_range
  // 23502 = not_null_violation
  // 23505 = unique_violation
  return ['22P02', '22003'].includes(pgError.code ?? '')
}

function isPostgresConflictError(error: unknown): boolean {
  const pgError = error as { code?: string }
  // 23505 = unique_violation
  return pgError.code === '23505'
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

    // Zod validation errors (from schema.parse() in route handlers)
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'ValidationError',
          message: 'Validation error',
          details: error.flatten().fieldErrors,
        },
      })
    }

    // PostgreSQL invalid input errors (e.g., invalid UUID format)
    if (isPostgresClientError(error)) {
      return reply.status(400).send({
        error: {
          code: 'ValidationError',
          message: 'Invalid parameter format',
        },
      })
    }

    // PostgreSQL unique constraint violations
    if (isPostgresConflictError(error)) {
      return reply.status(409).send({
        error: {
          code: 'ConflictError',
          message: 'Resource already exists',
        },
      })
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
