export interface ClassifiedError {
  retryable: boolean
  category:
    | 'rate_limit'
    | 'server_error'
    | 'network_error'
    | 'auth_error'
    | 'client_error'
    | 'unknown'
}

function getStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    if (typeof err.status === 'number') return err.status
    if (typeof err.statusCode === 'number') return err.statusCode
    if (err.response && typeof err.response === 'object') {
      const resp = err.response as Record<string, unknown>
      if (typeof resp.status === 'number') return resp.status
    }
  }
  return undefined
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    if (typeof err.code === 'string') return err.code
    if (err.cause && typeof err.cause === 'object') {
      const cause = err.cause as Record<string, unknown>
      if (typeof cause.code === 'string') return cause.code
    }
  }
  return undefined
}

const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EPIPE',
  'EAI_AGAIN',
])

export function classifyAIError(error: unknown): ClassifiedError {
  const status = getStatusCode(error)
  const code = getErrorCode(error)

  // Network errors
  if (code && NETWORK_ERROR_CODES.has(code)) {
    return { retryable: true, category: 'network_error' }
  }

  // Rate limit
  if (status === 429) {
    return { retryable: true, category: 'rate_limit' }
  }

  // Server errors (retryable)
  if (status && status >= 500 && status <= 504) {
    return { retryable: true, category: 'server_error' }
  }

  // Auth errors (not retryable)
  if (status === 401 || status === 403) {
    return { retryable: false, category: 'auth_error' }
  }

  // Client errors (not retryable)
  if (status === 400) {
    return { retryable: false, category: 'client_error' }
  }

  // Timeout errors
  if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
    return { retryable: true, category: 'network_error' }
  }

  return { retryable: true, category: 'unknown' }
}
