export interface RetryOptions {
  maxRetries: number
  baseDelay?: number
  maxDelay?: number
  jitter?: boolean
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxRetries,
    baseDelay = 1000,
    maxDelay = 30_000,
    jitter = true,
    shouldRetry,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries) break

      if (shouldRetry && !shouldRetry(error, attempt)) {
        throw error
      }

      const exponentialDelay = baseDelay * Math.pow(2, attempt)
      const jitterMs = jitter ? Math.random() * baseDelay * 0.5 : 0
      const delayMs = Math.min(exponentialDelay + jitterMs, maxDelay)

      onRetry?.(error, attempt, delayMs)

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
