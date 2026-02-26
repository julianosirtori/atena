export class CircuitBreakerOpenError extends Error {
  override name = 'CircuitBreakerOpenError'

  constructor(message = 'Circuit breaker is open') {
    super(message)
  }
}

export interface CircuitBreakerOptions {
  threshold?: number
  resetTimeMs?: number
  windowMs?: number
}

type CircuitState = 'closed' | 'open' | 'half-open'

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures: number[] = []
  private openedAt = 0

  private readonly threshold: number
  private readonly resetTimeMs: number
  private readonly windowMs: number

  constructor(options: CircuitBreakerOptions = {}) {
    this.threshold = options.threshold ?? 10
    this.resetTimeMs = options.resetTimeMs ?? 60_000
    this.windowMs = options.windowMs ?? 300_000
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.resetTimeMs) {
        this.state = 'half-open'
      } else {
        throw new CircuitBreakerOpenError()
      }
    }

    try {
      const result = await fn()

      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = []
      }

      return result
    } catch (error) {
      this.recordFailure()

      if (this.state === 'half-open') {
        this.trip()
      }

      throw error
    }
  }

  getState(): CircuitState {
    return this.state
  }

  reset(): void {
    this.state = 'closed'
    this.failures = []
    this.openedAt = 0
  }

  private recordFailure(): void {
    const now = Date.now()
    this.failures.push(now)

    // Prune failures outside the sliding window
    const windowStart = now - this.windowMs
    this.failures = this.failures.filter((ts) => ts >= windowStart)

    if (this.state === 'closed' && this.failures.length >= this.threshold) {
      this.trip()
    }
  }

  private trip(): void {
    this.state = 'open'
    this.openedAt = Date.now()
  }
}
